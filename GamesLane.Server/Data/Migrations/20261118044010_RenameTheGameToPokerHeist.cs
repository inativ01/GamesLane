using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamesLane.Server.Data.Migrations
{
    /// <summary>
    /// Renames the game type saved in the database, from its former name to <c>PokerHeist</c>: in saved sessions, saved
    /// game options, the games played and activity counts, and the users' order of the games.
    /// </summary>
    public partial class RenameTheGameToPokerHeist : Migration
    {
        private const string Former = "TheGang";
        private const string Current = "PokerHeist";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder) => Rename(migrationBuilder, Former, Current);

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder) => Rename(migrationBuilder, Current, Former);

        private static void Rename(MigrationBuilder migrationBuilder, string from, string to)
        {
            foreach (var table in new[] { "Sessions", "UserGameOptions", "GamePlays", "ActivityCounts" })
            {
                migrationBuilder.Sql($"""UPDATE "{table}" SET "GameType" = '{to}' WHERE "GameType" = '{from}';""");
            }

            migrationBuilder.Sql($"""
                UPDATE "Users" SET "GameOrder" = regexp_replace("GameOrder", '(^|,){from}(,|$)', '\1{to}\2')
                WHERE "GameOrder" ~ '(^|,){from}(,|$)';
                """);
        }
    }
}
