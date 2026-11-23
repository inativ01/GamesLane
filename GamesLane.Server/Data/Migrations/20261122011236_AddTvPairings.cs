using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamesLane.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTvPairings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TvPairings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TvId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    TvName = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PairedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastActiveAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvPairings", x => new { x.UserId, x.TvId });
                    table.ForeignKey(
                        name: "FK_TvPairings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TvPairings_LastActiveAt",
                table: "TvPairings",
                column: "LastActiveAt");

            migrationBuilder.CreateIndex(
                name: "IX_TvPairings_TvId",
                table: "TvPairings",
                column: "TvId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TvPairings");
        }
    }
}
