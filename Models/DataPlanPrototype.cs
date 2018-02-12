using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace v2ray_panel_master.Models
{
    [Table("DataPlanPrototypes")]
    public class DataPlanPrototype {
        [Key]
        public Guid Id { get; set; }
        public string Description { get; set; }
        public long TotalBytes { get; set; }
        public long CreateTime { get; set; }
        public long ExpireOffset { get; set; }
    }
}
