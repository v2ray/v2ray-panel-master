using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace v2ray_panel_master.Models
{
    public class DataPlanUpdateContext {
        public class UpdateRequest {
            public Guid PlanId;
            public long IncTraffic;
        }

        private PanelContext context;
        private bool running = false;
        private BlockingCollection<UpdateRequest> pending = new BlockingCollection<UpdateRequest>();

        public DataPlanUpdateContext(PanelContext newContext) {
            context = newContext;
        }
        public void Push(UpdateRequest req) {
            pending.Add(req);
        }

        public void Start() {
            Task.Run(() => Run());
        }

        public void Run() {
            if(running) throw new InvalidOperationException();
            running = true;

            while(true) {
                UpdateRequest req = pending.Take();
                try {
                    PerformUpdate(req);
                } catch(Exception e) {
                    Console.WriteLine(e);
                }
            }
        }

        private void PerformUpdate(UpdateRequest req) {
            DataPlan plan = context.DataPlans.Where(x => x.Id == req.PlanId).First();
            plan.IncUsedBytes(req.IncTraffic);
            context.DataPlans.Update(plan);
        }
    }
}
