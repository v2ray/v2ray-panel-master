using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography;
using System.Text;

namespace v2ray_panel_master.Models {
    [Table("Accounts")]
    public class Account {
        private static RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider();

        [Key]
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Password { get; set; }
        public string Salt { get; set; }
        public long CreateTime { get; set; }
        public bool IsAdmin { get; set; }

        public static Account Create(string name, string pw) {
            Account acc = new Account() {
                Id = Guid.NewGuid(),
                Name = name,
                Password = null,
                Salt = null,
                CreateTime = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                IsAdmin = false
            };
            acc.SetPassword(pw);
            return acc;
        }

        public bool VerifyPassword(string pw) {
            var sha256 = new SHA256CryptoServiceProvider();
            string hash = Convert.ToBase64String(
                sha256.ComputeHash(
                    Encoding.UTF8.GetBytes(Salt + pw)
                )
            );
            if(hash != Password) {
                return false;
            } else {
                return true;
            }
        }

        public void SetPassword(string pw) {
            byte[] newSaltRaw = new byte[8];
            rng.GetBytes(newSaltRaw);
            Salt = Convert.ToBase64String(newSaltRaw);

            var sha256 = new SHA256CryptoServiceProvider();
            string hash = Convert.ToBase64String(
                sha256.ComputeHash(
                    Encoding.UTF8.GetBytes(Salt + pw)
                )
            );
            Password = hash;
        }
    }
}
