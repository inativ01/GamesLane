using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GamesLane.Server.Auth;
using GamesLane.Server.Data;
using GamesLane.Server.Notifications;
using GamesLane.Server.Sessions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;

namespace GamesLane.Server.Tests;

public class NotificationTests
{
    private const string Alice = "user:alice";
    private const string Bob = "user:bob";
    private static readonly PlayerProfile AliceProfile = new("Alice", "🦊");
    private static readonly PlayerProfile BobProfile = new("Bob", "🐼");
    private static readonly string AliceDevice = new('a', 64);
    private static readonly string BobDevice = new('b', 64);

    private static readonly NotificationTexts Texts = new(new Dictionary<string, IReadOnlyDictionary<string, string>>
    {
        ["he"] = new Dictionary<string, string> { ["Tic-tac-toe"] = "איקס־עיגול", ["Your turn"] = "התור שלך" },
    });

    // Turn notifications

    [Fact]
    public async Task A_player_is_notified_when_their_turn_comes_while_they_have_no_page_of_the_game_open()
    {
        var (notifier, sender, _) = Notifier();
        var session = StartedTicTacToe();
        await notifier.SessionChangedAsync(session);
        session.Disconnect("conn-b", DateTimeOffset.UtcNow);

        Assert.True(session.TryMove(Alice, 0, 4, out var error), error);
        await notifier.SessionChangedAsync(session);

        var (device, notification) = Assert.Single(sender.Sent);
        Assert.Equal(BobDevice, device.Token);
        Assert.Equal(new PushNotification("איקס־עיגול", "התור שלך", "/tictactoe.html?session=ABC123", "ABC123"), notification);
    }

    [Fact]
    public async Task A_player_watching_the_game_is_not_notified_but_one_whose_page_is_out_of_view_is()
    {
        var (notifier, sender, _) = Notifier();
        var session = StartedTicTacToe();
        await notifier.SessionChangedAsync(session);

        Assert.True(session.TryMove(Alice, 0, 4, out var error), error);
        await notifier.SessionChangedAsync(session);
        Assert.Empty(sender.Sent);

        notifier.SetPageHidden("conn-a", true);
        Assert.True(session.TryMove(Bob, 1, 0, out error), error);
        await notifier.SessionChangedAsync(session);
        Assert.Equal([AliceDevice], sender.Sent.Select(s => s.Device.Token));

        notifier.SetPageHidden("conn-a", false);
        Assert.True(session.TryMove(Alice, 0, 1, out error), error);
        await notifier.SessionChangedAsync(session);
        Assert.True(session.TryMove(Bob, 1, 2, out error), error);
        await notifier.SessionChangedAsync(session);
        Assert.Single(sender.Sent);
    }

    [Fact]
    public async Task A_turn_notifies_once_and_a_session_seen_for_the_first_time_notifies_nobody()
    {
        var (notifier, sender, _) = Notifier();
        var session = StartedTicTacToe();
        session.Disconnect("conn-a", DateTimeOffset.UtcNow);

        await notifier.SessionChangedAsync(session);
        await notifier.SessionChangedAsync(session);
        Assert.Empty(sender.Sent);

        Assert.True(session.TryEndGame(Bob, out var error), error);
        await notifier.SessionChangedAsync(session);
        Assert.True(session.TryNewGame(Bob, 1, out error), error);
        await notifier.SessionChangedAsync(session);
        await notifier.SessionChangedAsync(session);
        Assert.Equal([AliceDevice], sender.Sent.Select(s => s.Device.Token));
    }

    [Fact]
    public async Task A_device_without_the_app_is_forgotten_and_nothing_is_sent_without_the_key()
    {
        var (notifier, sender, devices) = Notifier(PushResult.Unregistered);
        var session = StartedTicTacToe();
        await notifier.SessionChangedAsync(session);
        session.Disconnect("conn-b", DateTimeOffset.UtcNow);
        Assert.True(session.TryMove(Alice, 0, 4, out var error), error);
        await notifier.SessionChangedAsync(session);
        Assert.Equal([AliceDevice], devices.Tokens.Keys);

        var (unconfigured, unsent, _) = Notifier(configured: false);
        var other = StartedTicTacToe();
        await unconfigured.SessionChangedAsync(other);
        other.Disconnect("conn-b", DateTimeOffset.UtcNow);
        Assert.True(other.TryMove(Alice, 0, 4, out error), error);
        await unconfigured.SessionChangedAsync(other);
        Assert.Empty(unsent.Sent);
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef0123456789abcdef0123456789ABCDEF", true)]
    [InlineData("0123456789abcdef", false)]
    [InlineData("zz23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", false)]
    [InlineData(null, false)]
    public void Device_tokens_are_64_to_200_hexadecimal_digits(string? token, bool valid) =>
        Assert.Equal(valid, NotificationEndpoints.IsDeviceToken(token));

    private static TicTacToeSession StartedTicTacToe()
    {
        var session = new TicTacToeSession("ABC123");
        session.TryTakeSeat(Alice, AliceProfile, "conn-a", 0, out _);
        session.TryTakeSeat(Bob, BobProfile, "conn-b", 1, out _);
        Assert.True(session.TryNewGame(Alice, 0, out var error), error);
        return session;
    }

    private static (TurnNotifier Notifier, FakeSender Sender, FakeDevices Devices) Notifier(
        PushResult result = PushResult.Sent, bool configured = true)
    {
        var devices = new FakeDevices();
        devices.Tokens[AliceDevice] = new DeviceToken { Token = AliceDevice, UserKey = Alice, Language = "en" };
        devices.Tokens[BobDevice] = new DeviceToken { Token = BobDevice, UserKey = Bob, Language = "he" };
        var sender = new FakeSender(result, configured);
        return (new TurnNotifier(devices, sender, Texts, NullLogger<TurnNotifier>.Instance), sender, devices);
    }

    private sealed class FakeSender(PushResult result, bool configured) : IPushSender
    {
        public List<(DeviceToken Device, PushNotification Notification)> Sent { get; } = [];

        public bool IsConfigured => configured;

        public Task<PushResult> SendAsync(DeviceToken device, PushNotification notification)
        {
            Sent.Add((device, notification));
            return Task.FromResult(result);
        }
    }

    private sealed class FakeDevices : IDeviceTokenRepository
    {
        public Dictionary<string, DeviceToken> Tokens { get; } = [];

        public Task SaveAsync(string token, string userKey, bool isSandbox, string language, DateTimeOffset now)
        {
            Tokens[token] = new DeviceToken { Token = token, UserKey = userKey, IsSandbox = isSandbox, Language = language, UpdatedAt = now };
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<DeviceToken>> GetForUserAsync(string userKey) =>
            Task.FromResult<IReadOnlyList<DeviceToken>>([.. Tokens.Values.Where(d => d.UserKey == userKey)]);

        public Task DeleteAsync(string token)
        {
            Tokens.Remove(token);
            return Task.CompletedTask;
        }

        public Task DeleteForUserAsync(string userKey)
        {
            foreach (var device in Tokens.Values.Where(d => d.UserKey == userKey).ToList())
            {
                Tokens.Remove(device.Token);
            }

            return Task.CompletedTask;
        }

        public Task<int> DeleteUnusedAsync(DateTimeOffset before) => Task.FromResult(0);
    }

    // Apple's notification service

    private static readonly DateTimeOffset Now = new(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task A_notification_goes_to_the_device_s_servers_with_a_signed_token_the_app_s_topic_and_the_page_to_open()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var handler = new AppleServer(HttpStatusCode.OK, "");
        var sender = Sender(handler, key);
        var notification = new PushNotification("Backgammon", "Your turn", "/backgammon.html?session=ABC123", "ABC123");

        Assert.Equal(PushResult.Sent, await sender.SendAsync(Device(sandbox: false), notification));
        Assert.Equal(PushResult.Sent, await sender.SendAsync(Device(sandbox: true), notification));

        Assert.Equal([$"https://api.push.apple.com/3/device/{AliceDevice}", $"https://api.sandbox.push.apple.com/3/device/{AliceDevice}"],
            handler.Requests.Select(r => r.Uri));
        var request = handler.Requests[0];
        Assert.Equal(HttpVersion.Version20, request.Version);
        Assert.Equal("com.gameslane.app", request.Headers["apns-topic"]);
        Assert.Equal("alert", request.Headers["apns-push-type"]);
        Assert.Equal("ABC123", request.Headers["apns-collapse-id"]);
        Assert.Equal((Now + ApnsPushSender.DeliveryLimit).ToUnixTimeSeconds().ToString(), request.Headers["apns-expiration"]);

        using var body = JsonDocument.Parse(request.Body);
        Assert.Equal("Backgammon", body.RootElement.GetProperty("aps").GetProperty("alert").GetProperty("title").GetString());
        Assert.Equal("Your turn", body.RootElement.GetProperty("aps").GetProperty("alert").GetProperty("body").GetString());
        Assert.Equal("/backgammon.html?session=ABC123", body.RootElement.GetProperty("path").GetString());

        var token = request.Headers["Authorization"]["bearer ".Length..];
        Assert.Equal(token, handler.Requests[1].Headers["Authorization"]["bearer ".Length..]);
        var parts = token.Split('.');
        using var header = JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(parts[0]));
        using var payload = JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(parts[1]));
        Assert.Equal(("ES256", "KEY1234567"), (header.RootElement.GetProperty("alg").GetString(), header.RootElement.GetProperty("kid").GetString()));
        Assert.Equal(("7Z69JFQYCV", Now.ToUnixTimeSeconds()), (payload.RootElement.GetProperty("iss").GetString(), payload.RootElement.GetProperty("iat").GetInt64()));
        Assert.True(key.VerifyData(Encoding.ASCII.GetBytes($"{parts[0]}.{parts[1]}"), Base64UrlEncoder.DecodeBytes(parts[2]), HashAlgorithmName.SHA256));
    }

    [Theory]
    [InlineData(HttpStatusCode.Gone, """{"reason":"Unregistered"}""", PushResult.Unregistered)]
    [InlineData(HttpStatusCode.BadRequest, """{"reason":"BadDeviceToken"}""", PushResult.Unregistered)]
    [InlineData(HttpStatusCode.TooManyRequests, """{"reason":"TooManyRequests"}""", PushResult.Failed)]
    [InlineData(HttpStatusCode.InternalServerError, "", PushResult.Failed)]
    public async Task Apple_s_refusals_tell_whether_to_forget_the_device(HttpStatusCode status, string body, PushResult expected)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var sender = Sender(new AppleServer(status, body), key);

        Assert.Equal(expected, await sender.SendAsync(Device(sandbox: false), new PushNotification("T", "B", "/", "ABC123")));
    }

    [Fact]
    public async Task Without_the_key_nothing_is_sent()
    {
        var handler = new AppleServer(HttpStatusCode.OK, "");
        var sender = new ApnsPushSender(new AppleSettings("7Z69JFQYCV", "com.gameslane.app", "com.gameslane.web", null, null),
            new Clients(handler), new FixedTime(), NullLogger<ApnsPushSender>.Instance);

        Assert.False(sender.IsConfigured);
        Assert.Equal(PushResult.Failed, await sender.SendAsync(Device(sandbox: false), new PushNotification("T", "B", "/", "ABC123")));
        Assert.Empty(handler.Requests);
    }

    private static DeviceToken Device(bool sandbox) => new() { Token = AliceDevice, UserKey = Alice, Language = "en", IsSandbox = sandbox };

    private static ApnsPushSender Sender(AppleServer handler, ECDsa key) =>
        new(new AppleSettings("7Z69JFQYCV", "com.gameslane.app", "com.gameslane.web", "KEY1234567", key.ExportPkcs8PrivateKeyPem()),
            new Clients(handler), new FixedTime(), NullLogger<ApnsPushSender>.Instance);

    private sealed record SentRequest(string Uri, Version Version, Dictionary<string, string> Headers, string Body);

    private sealed class AppleServer(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public List<SentRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var headers = request.Headers.ToDictionary(h => h.Key, h => string.Join(",", h.Value));
            Requests.Add(new SentRequest(request.RequestUri!.ToString(), request.Version, headers,
                await request.Content!.ReadAsStringAsync(cancellationToken)));
            return new HttpResponseMessage(status) { Content = new StringContent(body) };
        }
    }

    private sealed class Clients(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class FixedTime : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
