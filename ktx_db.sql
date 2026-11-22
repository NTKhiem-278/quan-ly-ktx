-- 1. Xóa database cũ để làm sạch (nếu có)
DROP DATABASE IF EXISTS ktx_db;
CREATE DATABASE ktx_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ktx_db;

-- 2. Tạo các bảng mới

-- Bảng accounts
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user VARCHAR(50) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Sinh viên',
  email VARCHAR(100),
  student_id VARCHAR(20) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng rooms
CREATE TABLE rooms (
  id VARCHAR(20) PRIMARY KEY,
  zone VARCHAR(50) NOT NULL,
  type VARCHAR(60) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'ok'
);

-- Bảng students
CREATE TABLE students (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sex VARCHAR(10) NOT NULL DEFAULT 'Nam',
  room_id VARCHAR(20) NULL,
  faculty VARCHAR(100),
  phone VARCHAR(30),
  start_date DATE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Bảng invoices
CREATE TABLE invoices (
  id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  room_id VARCHAR(20) NOT NULL,
  month VARCHAR(7) NOT NULL,
  room_fee DECIMAL(10,2) NOT NULL,
  elec_old INT NOT NULL DEFAULT 0,
  elec_new INT NOT NULL DEFAULT 0,
  elec_rate DECIMAL(10,2) NOT NULL DEFAULT 3500,
  water_old INT NOT NULL DEFAULT 0,
  water_new INT NOT NULL DEFAULT 0,
  water_rate DECIMAL(10,2) NOT NULL DEFAULT 12000,
  due_date DATE NOT NULL,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATE NULL,
  method VARCHAR(30) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Bảng violations
CREATE TABLE violations (
  id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  room_id VARCHAR(20),
  date DATE NOT NULL,
  type VARCHAR(200) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'Nhắc nhở',
  created_by VARCHAR(100),
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Đã ghi nhận',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Bảng notices
CREATE TABLE notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT
);

-- 3. Chèn dữ liệu mẫu
INSERT INTO rooms (id, zone, type, capacity, price, status) VALUES
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
('C201','Khu C','8 giường · Nam',8,280000,'fix');

INSERT INTO students (id, name, sex, room_id, faculty, phone, start_date) VALUES
('SV21001','Nguyễn Minh','Nam','A101','Công nghệ thông tin','0912 345 678','2025-09-02'),
('SV21002','Trần Quốc Bảo','Nam','A101','Cơ khí','0938 112 233','2025-09-02'),
('SV21003','Lê Hoàng Long','Nam','A101','Điện tử viễn thông','0977 554 321','2025-09-05'),
('SV21013','Nguyễn Thu Hà','Nữ','B101','Kinh tế','0944 221 667','2025-09-02'),
('SV21014','Trần Khánh Linh','Nữ','B101','Ngôn ngữ Anh','0937 118 442','2025-09-02'),
('SV21022','Trương Quang Đạt','Nam','C101','Xây dựng','0967 883 220','2025-09-02');

INSERT INTO invoices (id, student_id, room_id, month, room_fee, elec_old, elec_new, water_old, water_new, due_date, paid) VALUES
('HD1125-01','SV21001','A101','11/2025',450000,120,150,8,10,'2025-12-10',0),
('HD1125-02','SV21002','A101','11/2025',450000,120,150,8,10,'2025-12-10',0),
('HD1125-03','SV21003','A101','11/2025',450000,120,150,8,10,'2025-12-10',1),
('HD1125-04','SV21013','B101','11/2025',450000,90,120,6,8,'2025-12-10',1),
('HD1025-01','SV21001','A101','10/2025',450000,90,120,6,8,'2025-11-10',1);

INSERT INTO violations (id, student_id, room_id, date, type, level, created_by, note, status) VALUES
('VP001','SV21001','A101','2025-11-20','Về ký túc xá sau giờ quy định','Nhắc nhở','Quản trị viên','Về lúc 23:30','Đã xử lý');

INSERT INTO notices (date, title, body) VALUES
('2025-12-01','Hóa đơn tháng 11 đã phát hành','Hạn thanh toán 10/12/2025. Sau hạn sẽ tính phí trễ 5.000đ/ngày.'),
('2025-11-25','Cắt nước bảo trì Khu A','Từ 8h đến 11h ngày 28/11 để súc rửa bể chứa.'),
('2025-11-20','Đăng ký ở lại Tết 2026','Nhận đăng ký tại phòng lễ tân đến hết 31/12/2025.');

ALTER TABLE violations ADD COLUMN reply TEXT NULL;