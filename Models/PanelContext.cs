using Microsoft.EntityFrameworkCore;

namespace v2ray_panel_master.Models {
    public class PanelContext : DbContext {
        public DataPlanUpdateContext DPUpdater;
        public PanelContext(DbContextOptions<PanelContext> options) : base(options) {
            DPUpdater = new DataPlanUpdateContext(this);
            DPUpdater.Start();
        }

        public DbSet<Account> Accounts { get; set; }
        public DbSet<DataPlan> DataPlans { get; set; }
        public DbSet<DataPlanPrototype> DataPlanPrototypes { get; set; }
        public DbSet<RemoteEndpoint> RemoteEndpoints { get; set; }
    }
}
