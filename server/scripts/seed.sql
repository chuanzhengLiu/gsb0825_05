USE flytie_atlas;

-- 默认材料类型
INSERT INTO material_types (name, category, unit, default_low_stock) VALUES
('干式钩 #12', '钩子', '个', 10),
('湿式钩 #10', '钩子', '个', 10),
('黑色尾羽', '羽毛', '根', 5),
('棕色鸡尾羽', '羽毛', '根', 5),
('红色丝线', '丝线', '卷', 1),
('黑色丝线', '丝线', '卷', 1),
('金色金属丝', '金属丝', '卷', 1),
('银色金属丝', '金属丝', '卷', 1),
('兔毛', '毛皮', '包', 1),
('鹿毛', '毛皮', '包', 1),
('孔雀羽眼', '羽毛', '根', 3),
('鹅绒', '羽毛', '包', 1);

-- 示例用户 demo / demo123 （密码 bcrypt hash）
INSERT INTO users (email, password_hash, nickname, bio) VALUES
('demo@flytie.atlas', '$2a$10$NRkSBhevTtZ/r9zMexnWd.iWOLa8MTP75sD8oyoZMqSbees9wextW', '飞钓达人', '热爱飞蝇钓，专注鳟鱼毛钩绑制。');

-- 示例毛钩：Adams 干式毛钩
INSERT INTO patterns (name, slug, description, target_fish, water_type, difficulty, image_url, created_by, is_public) VALUES
('Adams 干式毛钩', 'adams-dry-fly', '经典的全能干式毛钩，适合多种水面条件。', '鳟鱼', '溪流', '中等', '/uploads/patterns/adams.jpg', 1, TRUE);

SET @adams_id = LAST_INSERT_ID();

INSERT INTO pattern_steps (pattern_id, step_number, title, instruction, svg_data) VALUES
(@adams_id, 1, '准备钩身', '将钩子固定于绑制钳，线轴穿入黑色丝线，在钩柄上均匀缠绕基线至钩弯上方。', '{"type":"base_thread","color":"#1f2937"}'),
(@adams_id, 2, '绑尾羽', '取几根棕色鸡尾羽，长度约为钩身 1.5 倍，绑在钩弯上方，略微上扬。', '{"type":"tail","color":"#92400e"}'),
(@adams_id, 3, '缠身体', '用灰色兔毛或 dubbing 沿钩身向前缠绕，形成饱满的身体。', '{"type":"body","color":"#9ca3af"}'),
(@adams_id, 4, '绑翅', '将棕色与灰色羽毛各一对呈 X 形竖立在背部，形成 Adams 标志性的直立翅。', '{"type":"wings","color":"#78350f"}'),
(@adams_id, 5, '绑颈羽', '在头部环绕一圈棕色颈羽，形成蓬松的 hackle，最后打结收尾。', '{"type":"hackle","color":"#78350f"}');

INSERT INTO step_materials (step_id, material_name, amount, notes) VALUES
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 1 LIMIT 1), '干式钩 #12', '1 个', '常用尺寸'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 1 LIMIT 1), '黑色丝线', '适量', '6/0 或 8/0'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 2 LIMIT 1), '棕色鸡尾羽', '6-8 根', '取顶端纤维'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 3 LIMIT 1), '兔毛', '少量', '灰色 dubbing'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 4 LIMIT 1), '棕色鸡尾羽', '2 片', '翅尖修齐'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 4 LIMIT 1), '灰色鹅绒', '2 片', '与棕色羽配对'),
((SELECT id FROM pattern_steps WHERE pattern_id = @adams_id AND step_number = 5 LIMIT 1), '棕色鸡尾羽', '1 片', '颈羽部分');

-- 示例库存
INSERT INTO inventory (user_id, material_type_id, quantity, low_stock_threshold, notes) VALUES
(1, 1, 25, 10, '常用尺寸库存充足'),
(1, 2, 18, 10, NULL),
(1, 4, 4, 5, '需要补货'),
(1, 6, 2, 1, NULL),
(1, 9, 1, 1, NULL);

-- 示例计时记录
INSERT INTO tying_sessions (user_id, pattern_id, duration_seconds, notes) VALUES
(1, @adams_id, 420, '第一次练习'),
(1, @adams_id, 385, '熟练了一些'),
(1, @adams_id, 350, '比较稳定');

-- 更新平均时间
UPDATE patterns SET
  avg_time_seconds = (SELECT AVG(duration_seconds) FROM tying_sessions WHERE pattern_id = @adams_id),
  tie_count = (SELECT COUNT(*) FROM tying_sessions WHERE pattern_id = @adams_id)
WHERE id = @adams_id;

-- 再添加几款毛钩
INSERT INTO patterns (name, slug, description, target_fish, water_type, difficulty, image_url, created_by, is_public) VALUES
('Woolly Bugger', 'woolly-bugger', '万能的湿式/Streamer 毛钩，适合鳟鱼与鲈鱼。', '鳟鱼', '湖泊', '简单', '/uploads/patterns/woolly-bugger.jpg', 1, TRUE),
('Clouser Minnow', 'clouser-minnow', '沉水型拟饵，针对鲈鱼与小嘴鲈。', '鲈鱼', '河流', '中等', '/uploads/patterns/clouser.jpg', 1, TRUE),
('Elk Hair Caddis', 'elk-hair-caddis', '模仿石蚕蛾的干式毛钩，浮力极佳。', '鳟鱼', '溪流', '中等', '/uploads/patterns/elk-hair-caddis.jpg', 1, TRUE),
('Salmon Fly', 'salmon-fly', '大型鲑鱼毛钩，色彩鲜艳。', '鲑鱼', '河流', '困难', '/uploads/patterns/salmon-fly.jpg', 1, TRUE);

-- 示例作品
INSERT INTO works (user_id, pattern_id, title, description, image_url, is_public) VALUES
(1, @adams_id, '我的第一只 Adams', '练习了三次，终于把翅立起来了！', '/uploads/works/demo-adams.jpg', TRUE);
