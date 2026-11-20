using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamesLane.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedGameLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SavedGameLimit",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 2);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SavedGameLimit",
                table: "Users");
        }
    }
}
