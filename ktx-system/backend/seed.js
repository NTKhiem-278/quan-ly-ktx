const pool = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  const hash = await bcrypt.hash('123456', 10);

  await pool.query(`INSERT INTO rooms (id,zone,type,capacity,price,status) VALUES
    ('A101','Khu A','4 giường · Nam',4,450000,'ok'),
    ('A102','Khu A','4 giường · Nam',4,450000,'ok'),
    ('A103','Khu A','6 giường · Nam',6,350000,'ok'),
    ('A104','Khu A','4 giường · Nam',4,450000,'fix'),
    ('A201','Khu A','6 giường · Nam',6,350000,'ok'),
    ('B101','Khu B','4 giường · Nữ',4,450000,'ok'),
    ('B102','Khu B','4 giường · Nữ',4,450000,'ok'),
    ('B103','Khu B','6 giường · Nữ',6,350000,'ok'),
    ('B201','Khu B','4 giường · Nữ',4,450000,'ok'),
    ('C101','Khu C','8 giường · Nam',8,280000,'ok'),
    ('C102','Khu C','8 giường · Nữ',8,280000,'ok'),
    ('C201','Khu C','8 giường · Nam',8,280000,'fix')
    ON DUPLICATE KEY UPDATE type=VALUES(type)`);

  await pool.query(`INSERT INTO students (id,name,sex,room_id,faculty,phone,start_date) VALUES
    ('SV21001','Nguyễn Minh','Nam','A101','Công nghệ thông tin','0912 345 678','2025-09-02'),
    ('SV21002','Trần Quốc Bảo','Nam','A101','Cơ khí','0938 112 233','2025-09-02'),
    ('SV21003','Lê Hoàng Long','Nam','A101','Điện tử viễn thông','0977 554 321','2025-09-05'),
    ('SV21013','Nguyễn Thu Hà','Nữ','B101','Kinh tế','0944 221 667','2025-09-02'),
    ('SV21014','Trần Khánh Linh','Nữ','B101','Ngôn ngữ Anh','0937 118 442','2025-09-02'),
    ('SV21022','Trương Quang Đạt','Nam','C101','Xây dựng','0967 883 220','2025-09-02')
    ON DUPLICATE KEY UPDATE name=VALUES(name)`);

  const accounts = [
    ['sv21001','Nguyễn Minh','Sinh viên','minh.nguyen@sv.edu.vn','SV21001'],
    ['sv21013','Nguyễn Thu Hà','Sinh viên','ha.nguyen@sv.edu.vn','SV21013'],
    ['letan.a','Phạm Thị Lan','Lễ tân','lan.pham@ktx.edu.vn',null],
    ['letan.b','Trần Văn Cường','Lễ tân','cuong.tran@ktx.edu.vn',null],
  ];

  await pool.query("SET NAMES utf8mb4");

  for (const [u, n, r, mail, sv] of accounts) {
    await pool.query(
      `INSERT INTO accounts (user,pass_hash,name,role,email,student_id,active)
       VALUES (?,?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE pass_hash=VALUES(pass_hash), name=VALUES(name), role=VALUES(role)`,
      [u, hash, n, r, mail, sv]
    );
  }

  await pool.query(`INSERT INTO invoices
    (id,student_id,room_id,month,room_fee,elec_old,elec_new,elec_rate,water_old,water_new,water_rate,due_date,paid)
    VALUES
    ('HD1125-01','SV21001','A101','2025-11',450000,1200,1290,3500,80,86,8000,'2025-12-10',0),
    ('HD1025-01','SV21001','A101','2025-10',450000,1110,1200,3500,74,80,8000,'2025-11-10',1),
    ('HD1125-02','SV21013','B101','2025-11',450000,900,970,3500,60,66,8000,'2025-12-10',0)
    ON DUPLICATE KEY UPDATE month=VALUES(month)`);

  await pool.query(`INSERT INTO violations
    (id,student_id,room_id,date,type,level,created_by,note,status) VALUES
    ('VP001','SV21001','A101','2025-11-25','Về ký túc xá sau giờ quy định','Cảnh cáo','Phạm Thị Lan','Về lúc 23:45 ngày 24/11','Đang xử lý')
    ON DUPLICATE KEY UPDATE type=VALUES(type)`);

  await pool.query(`INSERT INTO notices (date,title,body) VALUES
    ('2025-12-01','Hóa đơn tháng 11 đã phát hành','Hạn thanh toán 10/12/2025. Sau hạn sẽ tính phí trễ 5.000đ/ngày.'),
    ('2025-11-25','Cắt nước bảo trì Khu A','Từ 8h đến 11h ngày 28/11 để súc rửa bể chứa.'),
    ('2025-11-20','Đăng ký ở lại Tết 2026','Nhận đăng ký tại phòng lễ tân đến hết 31/12/2025.')`);

  console.log('✓ Seed xong. Mật khẩu mặc định: 123456');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });