using Microsoft.EntityFrameworkCore;

namespace v2ray_panel_master.Models {
    public class PanelContext : DbContext {
        public PanelContext(DbContextOptions<PanelContext> options) : base(options) {

        }

        public DbSet<Account> Accounts { get; set; }
    }
}
