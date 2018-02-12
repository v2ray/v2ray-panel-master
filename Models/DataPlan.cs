using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace v2ray_panel_master.Models
{
    [Table("DataPlans")]
    public class DataPlan {
        [Key]
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid PrototypeId { get; set; }
        public long TotalBytes { get; set; }
        public long UsedBytes { get; set; }
        public long CreateTime { get; set; }
        public long ExpireTime { get; set; }

        public static DataPlan FromPrototype(Account acc, DataPlanPrototype proto) {
            long time = DateTimeOffset.Now.ToUnixTimeMilliseconds();

            return new DataPlan() {
                Id = Guid.NewGuid(),
                UserId = acc.Id,
                PrototypeId = proto.Id,
                TotalBytes = proto.TotalBytes,
                UsedBytes = 0,
                CreateTime = time,
                ExpireTime = time + proto.ExpireOffset
            };
        }

        public void IncUsedBytes(long n) {
            if(n < 0) {
                throw new ArgumentOutOfRangeException();
            }
            UsedBytes += n;
        }
    }
}
