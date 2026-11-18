"use strict";

// Wazoo: 1 to 8 players take turns in seat order for 13 rounds. On their turn, a player rolls the five dice up to three
// times, tapping dice to keep them between rolls, then taps an open box of their scorecard to score the dice there.
// Everyone sees the dice; the scorecard shows the user's column and the player to play's (or the player tapped in the
// players' table, until the turn passes), and the players' table every player's total. The open boxes of the player to
// play show what the dice would score.

const SVG_NS = "http://www.w3.org/2000/svg";
const ROUNDS = 13;
const ROLLS = 3;

// The boxes, in the server's order, each with its name and a short note on how it scores. The first 6 are the upper section.
const BOXES = [
    { key: "Ones", label: "Ones" }, { key: "Twos", label: "Twos" }, { key: "Threes", label: "Threes" },
    { key: "Fours", label: "Fours" }, { key: "Fives", label: "Fives" }, { key: "Sixes", label: "Sixes" },
    { key: "ThreeOfAKind", label: "Three of a kind", note: "Total of all dice" },
    { key: "FourOfAKind", label: "Four of a kind", note: "Total of all dice" },
    { key: "FullHouse", label: "Full house", note: "25" },
    { key: "SmallStraight", label: "Small straight", note: "30" },
    { key: "LargeStraight", label: "Large straight", note: "40" },
    { key: "Wazoo", label: "Wazoo", note: "50" },
    { key: "Chance", label: "Chance", note: "Total of all dice" },
];
const UPPER = 6;
const boxName = (key) => t(BOXES.find((box) => box.key === key).label);

function svg(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
}

// Dots on a die face, on a 3 by 3 grid.
const PIPS = {
    1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

// A die face showing value (1 to 6), or a blank face for 0 (not rolled yet).
function dieFace(value) {
    const face = svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
    face.append(svg("rect", { x: 5, y: 5, width: 90, height: 90, rx: 18 }));
    (PIPS[value] ?? []).forEach(([col, row]) => face.append(svg("circle", { cx: 50 + (col - 1) * 27, cy: 50 + (row - 1) * 27, r: 9 })));
    return face;
}

// The rolling animation: the dice that were not kept tumble and bounce for a moment, with the sound of the dice (of a
// single die when only one was rolled), when the state shows a new roll (not when the page first opens). The open boxes
// show what the dice score only once the dice have stopped.
const ROLL_MS = 800;
let seenRolls = null;
let rollingUntil = 0;
let rollTimer = 0;

function noticeRoll(game) {
    if (seenRolls !== null && game.rolls > seenRolls) {
        playGameSound(game.held.filter((held) => !held).length === 1 ? "die" : "dice");
        rollingUntil = Date.now() + ROLL_MS;
        clearInterval(rollTimer);
        // The last redraw is the one that starts after the animation's end, so it shows the dice rolled.
        rollTimer = setInterval(() => {
            if (Date.now() >= rollingUntil) clearInterval(rollTimer);
            wazoo.refresh();
        }, 90);
    }
    seenRolls = game.rolls;
}

// The status line and the message about the last turn. The status starts with 👉 when the viewer must act (the status bar
// then turns gold), ⏳ while they wait, and 🏆 or 🤝 for the result. Each message has a form for the viewer ("You
// scored…") and one for a named player ("Dana scored…"); a user holding several seats sees the named forms.
function wazooTexts(game, state, view) {
    const name = (seat) => state.seats[seat]?.name ?? t("Seat {n}", { n: seat + 1 });
    const several = view.mySeats.length > 1;
    const about = (seat, you, other, values = {}) =>
        (view.isMe(seat) && !several ? t(you, values) : t(other, { name: name(seat), ...values }));
    let status;
    if (game.isOver) {
        const best = game.players.find((p) => p.seat === game.winners[0]).total;
        status = game.players.length === 1 ? `🏆 ${t("Game over: {n} points.", { n: best })}`
            : game.winners.length === 1 ? `🏆 ${about(game.winners[0], "You win with {n} points!", "{name} wins with {n} points!", { n: best })}`
                : `🤝 ${t("A tie at {n} points: {names}.", { n: best, names: game.winners.map(name).join(", ") })}`;
    } else if (!view.isMe(game.turn)) {
        status = `⏳ ${t("Waiting for {name}", { name: name(game.turn) })}`;
    } else {
        const action = game.rollsLeft === ROLLS ? t("Roll the dice")
            : game.rollsLeft > 0 ? t("Keep dice and roll again ({n} left), or choose a box", { n: game.rollsLeft })
                : t("Choose a box to score");
        status = `👉 ${several ? `${name(game.turn)}: ` : ""}${action}`;
    }

    let message = "";
    const last = game.lastTurn;
    if (last) {
        message = about(last.seat, "You scored {points} in {box}.", "{name} scored {points} in {box}.",
            { points: last.points, box: boxName(last.category) });
        if (last.bonus) {
            message += ` ${t("Wazoo bonus: +100!")}`;
        }
    }
    return { status, message };
}

// The five dice. On the viewer's turn, between rolls, tapping a die keeps it (or lets it go again).
function renderDice(game, canAct, rolling) {
    const canHold = canAct && game.rollsLeft > 0 && game.rollsLeft < ROLLS;
    $("yz-dice").replaceChildren(...game.dice.map((value, i) => {
        const held = game.held[i];
        const tumbling = rolling && !held && value > 0;
        const die = el("button", "yz-die", dieFace(tumbling ? 1 + Math.floor(Math.random() * 6) : value));
        die.type = "button";
        die.disabled = !canHold;
        die.classList.toggle("held", held);
        die.classList.toggle("blank", value === 0);
        die.classList.toggle("tumbling", tumbling);
        die.setAttribute("aria-pressed", String(held));
        die.setAttribute("aria-label", value ? t("Die showing {n}", { n: value }) : t("Not rolled yet"));
        if (held) {
            die.append(el("span", "yz-die-label", t("Kept")));
        }
        die.addEventListener("click", () => call("HoldDie", wazoo.sessionId, game.turn, i, !held).catch(() => {}));
        return die;
    }));
}

// Scoring 0 in a box asks first, since it is easy to tap by mistake.
function scoreBox(game, box, points) {
    if (points === 0 && !confirm(t("Score 0 in {box}?", { box: t(box.label) }))) return;
    call("Score", wazoo.sessionId, game.turn, box.key).catch(() => {});
}

// The user's seat in the scorecard: the seat to play if the user holds it, otherwise the one of theirs that played last
// (the first before the seat to play, in seat order); null for watchers.
function mySeat(game, view) {
    const seats = game.players.map((player) => player.seat);
    const at = Math.max(0, seats.indexOf(game.turn));
    for (let i = 0; i < seats.length; i++) {
        const seat = seats[(at - i + seats.length) % seats.length];
        if (view.isMe(seat)) return seat;
    }
    return null;
}

// The player tapped in the players' table, shown until the turn passes; otherwise the player to play (the winner once
// the game is over).
let picked = null;
const turnKey = (game) => `${game.round}:${game.turn}:${game.isOver}`;
const shownSeat = (game) => (picked?.turn === turnKey(game) ? picked.seat : game.isOver ? game.winners[0] : game.turn);

// The scorecard's players: the user's seat, then the shown player (once, when they are the same).
function cardPlayers(game, view) {
    const seats = [...new Set([mySeat(game, view), shownSeat(game)].filter((seat) => seat !== null && seat !== undefined))];
    return seats.map((seat) => game.players.find((player) => player.seat === seat)).filter(Boolean);
}

// The scorecard: a column per player shown (the player to play is highlighted), a row per box, and the totals, in two
// tables: the upper section with its total and bonus, and the lower one with the Wazoo bonus and the total. The open
// boxes of the player to play show what the dice would score there; on the viewer's turn, tapping one scores it.
function renderCard(game, state, view, canAct, rolling, players) {
    const turnClass = (player) => (!game.isOver && player.seat === game.turn ? "turn" : null);
    const rowHead = (text, note) => {
        const th = el("th", null, text);
        th.scope = "row";
        th.title = note ? `${text}: ${note}` : text;
        if (note) th.append(el("small", null, note));
        return th;
    };
    const head = () => el("thead", null, el("tr", null, el("th"), ...players.map((player) => {
        const th = el("th", turnClass(player), seatLabel(state, player.seat, view));
        th.scope = "col";
        th.title = seatName(state, player.seat, view);
        th.classList.toggle("winner", game.winners.includes(player.seat));
        return th;
    })));
    const boxRow = (box, i) => el("tr", null, rowHead(t(box.label), box.note && t(box.note)), ...players.map((player) => {
        const td = el("td", turnClass(player));
        td.dataset.seat = String(player.seat);
        td.dataset.box = box.key;
        const score = player.scores[i];
        const option = player.seat === game.turn && !rolling ? game.possibleScores[i] : null;
        if (score !== null) {
            td.textContent = String(score);
        } else if (option !== null && canAct) {
            const button = el("button", option === 0 ? "yz-option zero" : "yz-option", String(option));
            button.type = "button";
            button.title = t("Score {points} in {box}", { points: option, box: t(box.label) });
            button.addEventListener("click", () => scoreBox(game, box, option));
            td.append(button);
        } else if (option !== null) {
            td.append(el("span", option === 0 ? "yz-option preview zero" : "yz-option preview", String(option)));
        }
        return td;
    }));
    const sumRow = (label, note, value, className) => el("tr", className,
        rowHead(label, note), ...players.map((player) => el("td", turnClass(player), String(value(player)))));
    const plus = (points) => (points ? `+${points}` : "–");
    $("yz-upper").replaceChildren(head(), el("tbody", null,
        ...BOXES.slice(0, UPPER).map((box, i) => boxRow(box, i)),
        sumRow(t("Upper total"), null, (player) => player.upperTotal, "yz-sum"),
        sumRow(t("Bonus"), t("35 for 63 or more"), (player) => plus(player.upperBonus), "yz-sum")));
    $("yz-lower").replaceChildren(head(), el("tbody", null,
        ...BOXES.slice(UPPER).map((box, i) => boxRow(box, UPPER + i)),
        sumRow(t("Wazoo bonus"), t("100 for each extra Wazoo"), (player) => plus(player.wazooBonus), "yz-sum"),
        sumRow(t("Total"), null, (player) => player.total, "yz-sum yz-total")));
}

// The players' table: shown until a player hides it (remembered on this device). Observers always see it.
const TABLE_SHOWN_KEY = "wazoo.tableShown";
const tableShown = () => localStorage.getItem(TABLE_SHOWN_KEY) !== "0";

// A player in the table: name and total; the player to play is outlined, and the players in the scorecard are marked.
// Tapping a player shows their scorecard beside the user's until the turn passes.
function playerItem(game, state, view, player, shown) {
    const button = el("button", "yz-player", el("span", "rp-start", seatLabel(state, player.seat, view)),
        el("span", "rp-end", el("strong", null, t("{n} points", { n: player.total }))));
    button.type = "button";
    button.setAttribute("aria-pressed", String(shown));
    button.addEventListener("click", () => {
        picked = { seat: player.seat, turn: turnKey(game) };
        wazoo.refresh();
    });
    const item = el("li", null, button);
    item.classList.toggle("turn", !game.isOver && player.seat === game.turn);
    item.classList.toggle("shown", shown);
    return item;
}

function renderTable(game, state, view, players) {
    const shown = !view.isPlayer || tableShown();
    $("yz-round").textContent = game.isOver ? t("Final scores") : t("Round {n} of {total}", { n: game.round, total: ROUNDS });
    $("yz-toggle-table").hidden = !view.isPlayer;
    $("yz-toggle-table").textContent = t(shown ? "Hide table" : "Show table");
    $("yz-table-body").hidden = !shown;
    $("yz-players").replaceChildren(...game.players.map((player) =>
        playerItem(game, state, view, player, players.includes(player))));
}

// The dice and the scorecard take the largest font size (9 to 18 pixels) at which they fit the screen; then a name too
// long for its column shows only the icon, and a note too long for its row is left out.
function fitPlay() {
    if ($("game-screen").hidden) return;
    const play = $("yz-play");
    const fits = () => play.getBoundingClientRect().bottom + scrollY <= innerHeight - 4;
    let low = 9;
    let high = 18;
    play.style.fontSize = `${high}px`;
    if (!fits()) {
        while (high - low > 0.5) {
            const size = (low + high) / 2;
            play.style.fontSize = `${size}px`;
            if (fits()) low = size; else high = size;
        }
        play.style.fontSize = `${low}px`;
    }
    play.querySelectorAll("thead th").forEach((th) => {
        th.classList.remove("icon-only");
        const name = th.querySelector(".seat-label-name");
        if (name && name.scrollWidth > name.clientWidth) th.classList.add("icon-only");
    });
    play.querySelectorAll("th[scope='row']").forEach((th) => {
        th.classList.remove("no-note");
        if (th.scrollWidth > th.clientWidth) th.classList.add("no-note");
    });
    fitScores();
}

let current = null;

// A box scored: the chip's clink, and the new score drops into its box (when its player is in the scorecard).
function noticeScore(game, view) {
    const last = game.lastTurn;
    if (!view.changed("score", [game.round, last?.seat, last?.category]) || !last) return;
    playGameSound("chip");
    $("yz-sheet").querySelector(`td[data-seat="${last.seat}"][data-box="${last.category}"]`)?.classList.add("scored");
}

const wazoo = startSessionPage("Wazoo", (game, state, view) => {
    noticeRoll(game);
    const rolling = Date.now() < rollingUntil;
    const canAct = !game.isOver && view.isMe(game.turn);
    current = { game, canAct };

    placeScores($("yz-dice-row"));
    showScores(state, view, [],
        game.players.map((player) => ({ seat: player.seat, score: player.total, acting: !game.isOver && player.seat === game.turn })));
    const { status, message } = wazooTexts(game, state, view);
    $("status").textContent = status;
    // Confetti for the winner, and for a player alone at the end of their game.
    if (game.isOver && game.winners.some((seat) => view.isMe(seat))) {
        celebrate(state, "over");
    }
    $("yz-message").textContent = message;
    $("yz-message").hidden = !message;
    renderDice(game, canAct, rolling);
    const roll = $("yz-roll");
    roll.hidden = !(canAct && game.rollsLeft > 0);
    roll.title = game.rollsLeft === ROLLS ? t("Roll") : t("Roll again ({n} left)", { n: game.rollsLeft });
    roll.setAttribute("aria-label", roll.title);
    const players = cardPlayers(game, view);
    renderCard(game, state, view, canAct, rolling, players);
    renderTable(game, state, view, players);
    fitPlay();
    noticeScore(game, view);
});

$("yz-roll").addEventListener("click", () => {
    if (current?.canAct) call("RollDice", wazoo.sessionId, current.game.turn).catch(() => {});
});
$("yz-toggle-table").addEventListener("click", () => {
    localStorage.setItem(TABLE_SHOWN_KEY, tableShown() ? "0" : "1");
    wazoo.refresh();
});
addEventListener("resize", () => requestAnimationFrame(() => {
    placeScores($("yz-dice-row"));
    fitPlay();
}));
