using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamesLane.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceTokens",
                columns: table => new
                {
                    Token = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UserKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsSandbox = table.Column<bool>(type: "boolean", nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceTokens", x => x.Token);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceTokens_UpdatedAt",
                table: "DeviceTokens",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceTokens_UserKey",
                table: "DeviceTokens",
                column: "UserKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceTokens");
        }
    }
}
