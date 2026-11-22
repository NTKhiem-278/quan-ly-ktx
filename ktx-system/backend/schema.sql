-- 1. Xóa database cũ để làm sạch (nếu có)
USE master;
GO
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'ktx_db')
BEGIN
    ALTER DATABASE ktx_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ktx_db;
END
GO
CREATE DATABASE ktx_db;
GO
USE ktx_db;
GO

-- 2. Tạo các bảng mới

-- Bảng accounts
CREATE TABLE accounts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  [user] VARCHAR(50) NOT NULL UNIQUE, -- Dùng ngoặc vuông vì 'user' là từ khóa hệ thống
  pass_hash VARCHAR(255) NOT NULL,
  name NVARCHAR(100) NOT NULL,
  role NVARCHAR(50) NOT NULL DEFAULT N'Sinh viên'
       CHECK (role IN (N'Sinh viên', N'Lễ tân', N'Quản trị viên')),
  email VARCHAR(100),
  student_id VARCHAR(20) NULL,
  active BIT NOT NULL DEFAULT 1, -- BIT thay cho TINYINT(1)
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT GETDATE()
);

-- Bảng rooms
CREATE TABLE rooms (
  id VARCHAR(20) PRIMARY KEY,
  zone NVARCHAR(50) NOT NULL,
  type NVARCHAR(60) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'ok'
         CHECK (status IN ('ok', 'fix'))
);

-- Bảng students
CREATE TABLE students (
  id VARCHAR(20) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  sex NVARCHAR(10) NOT NULL DEFAULT N'Nam'
      CHECK (sex IN (N'Nam', N'Nữ')),
  room_id VARCHAR(20) NULL,
  faculty NVARCHAR(100),
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
  paid BIT NOT NULL DEFAULT 0,
  paid_at DATE NULL,
  method NVARCHAR(30) NULL,
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Bảng violations
CREATE TABLE violations (
  id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  room_id VARCHAR(20),
  date DATE NOT NULL,
  type NVARCHAR(200) NOT NULL,
  level NVARCHAR(20) NOT NULL DEFAULT N'Nhắc nhở'
        CHECK (level IN (N'Nhắc nhở', N'Cảnh cáo', N'Kỷ luật')),
  created_by NVARCHAR(100),
  note NVARCHAR(MAX), -- NVARCHAR(MAX) thay cho TEXT
  status NVARCHAR(20) NOT NULL DEFAULT N'Đã ghi nhận'
         CHECK (status IN (N'Đã ghi nhận', N'Đang xử lý', N'Đã xử lý')),
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Bảng notices
CREATE TABLE notices (
  id INT IDENTITY(1,1) PRIMARY KEY,
  date DATE NOT NULL,
  title NVARCHAR(200) NOT NULL,
  body NVARCHAR(MAX)
);
GO

-- 3. Chèn dữ liệu mẫu
INSERT INTO rooms (id, zone, type, capacity, price, status) VALUES
('A101',N'Khu A',N'4 giường · Nam',4,450000,'ok'),
('A102',N'Khu A',N'4 giường · Nam',4,450000,'ok'),
('A103',N'Khu A',N'6 giường · Nam',6,350000,'ok'),
('A104',N'Khu A',N'4 giường · Nam',4,450000,'fix'),
('A201',N'Khu A',N'6 giường · Nam',6,350000,'ok'),
('B101',N'Khu B',N'4 giường · Nữ',4,450000,'ok'),
('B102',N'Khu B',N'4 giường · Nữ',4,450000,'ok'),
('B103',N'Khu B',N'6 giường · Nữ',6,350000,'ok'),
('B201',N'Khu B',N'4 giường · Nữ',4,450000,'ok'),
('C101',N'Khu C',N'8 giường · Nam',8,280000,'ok'),
('C102',N'Khu C',N'8 giường · Nữ',8,280000,'ok'),
('C201',N'Khu C',N'8 giường · Nam',8,280000,'fix');

INSERT INTO students (id, name, sex, room_id, faculty, phone, start_date) VALUES
('SV21001',N'Nguyễn Minh',N'Nam','A101',N'Công nghệ thông tin','0912 345 678','2025-09-02'),
('SV21002',N'Trần Quốc Bảo',N'Nam','A101',N'Cơ khí','0938 112 233','2025-09-02'),
('SV21003',N'Lê Hoàng Long',N'Nam','A101',N'Điện tử viễn thông','0977 554 321','2025-09-05'),
('SV21013',N'Nguyễn Thu Hà',N'Nữ','B101',N'Kinh tế','0944 221 667','2025-09-02'),
('SV21014',N'Trần Khánh Linh',N'Nữ','B101',N'Ngôn ngữ Anh','0937 118 442','2025-09-02'),
('SV21022',N'Trương Quang Đạt',N'Nam','C101',N'Xây dựng','0967 883 220','2025-09-02');

INSERT INTO invoices (id, student_id, room_id, month, room_fee, elec_old, elec_new, water_old, water_new, due_date, paid) VALUES
('HD1125-01','SV21001','A101','11/2025',450000,120,150,8,10,'2025-12-10',0),
('HD1125-02','SV21002','A101','11/2025',450000,120,150,8,10,'2025-12-10',0),
('HD1125-03','SV21003','A101','11/2025',450000,120,150,8,10,'2025-12-10',1),
('HD1125-04','SV21013','B101','11/2025',450000,90,120,6,8,'2025-12-10',1),
('HD1025-01','SV21001','A101','10/2025',450000,90,120,6,8,'2025-11-10',1);

INSERT INTO violations (id, student_id, room_id, date, type, level, created_by, note, status) VALUES
('VP001','SV21001','A101','2025-11-20',N'Về ký túc xá sau giờ quy định',N'Nhắc nhở',N'Quản trị viên',N'Về lúc 23:30',N'Đã xử lý');

INSERT INTO notices (date, title, body) VALUES
('2025-12-01',N'Hóa đơn tháng 11 đã phát hành',N'Hạn thanh toán 10/12/2025. Sau hạn sẽ tính phí trễ 5.000đ/ngày.'),
('2025-11-25',N'Cắt nước bảo trì Khu A',N'Từ 8h đến 11h ngày 28/11 để súc rửa bể chứa.'),
('2025-11-20',N'Đăng ký ở lại Tết 2026',N'Nhận đăng ký tại phòng lễ tân đến hết 31/12/2025.');