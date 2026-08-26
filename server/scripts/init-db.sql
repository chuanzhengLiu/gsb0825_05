CREATE DATABASE IF NOT EXISTS flytie_atlas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flytie_atlas;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 毛钩款式表
CREATE TABLE IF NOT EXISTS patterns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  target_fish VARCHAR(100) NOT NULL COMMENT '目标鱼种：鳟鱼/鲈鱼/鲑鱼等',
  water_type VARCHAR(100) NOT NULL COMMENT '水域类型：溪流/湖泊/河流/咸水',
  difficulty VARCHAR(50) COMMENT '难度',
  image_url VARCHAR(500),
  is_public BOOLEAN DEFAULT TRUE,
  created_by INT,
  avg_time_seconds INT DEFAULT 0 COMMENT '平均绑制时间（秒）',
  tie_count INT DEFAULT 0 COMMENT '绑制次数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 绑制步骤表
CREATE TABLE IF NOT EXISTS pattern_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pattern_id INT NOT NULL,
  step_number INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  instruction TEXT,
  svg_data TEXT COMMENT 'SVG 示意图 JSON 或字符串',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_pattern_step (pattern_id, step_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 步骤材料清单
CREATE TABLE IF NOT EXISTS step_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step_id INT NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  amount VARCHAR(100),
  notes VARCHAR(500),
  FOREIGN KEY (step_id) REFERENCES pattern_steps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 材料类型表
CREATE TABLE IF NOT EXISTS material_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL COMMENT '羽毛/丝线/钩子/金属丝/毛皮等',
  unit VARCHAR(50) NOT NULL COMMENT '单位：根/卷/包/个',
  default_low_stock DECIMAL(10,2) DEFAULT 0 COMMENT '默认低库存阈值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户材料库存表
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  material_type_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_type_id) REFERENCES material_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_material (user_id, material_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 绑制计时记录表
CREATE TABLE IF NOT EXISTS tying_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pattern_id INT,
  duration_seconds INT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pattern_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_favorite (user_id, pattern_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户作品表
CREATE TABLE IF NOT EXISTS works (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pattern_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  like_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 作品点赞表
CREATE TABLE IF NOT EXISTS work_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  work_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_work_like (user_id, work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 作品收藏表
CREATE TABLE IF NOT EXISTS work_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  work_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_work_favorite (user_id, work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
