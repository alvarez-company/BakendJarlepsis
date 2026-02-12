-- Script para poblar la tabla de municipios de Colombia
-- Municipios principales por departamento

-- Nota: Se asume que los departamentos ya están creados con los siguientes IDs:
-- 1: Antioquia, 2: Atlántico, 3: Bogotá D.C., 4: Bolívar, 5: Boyacá, 
-- 6: Caldas, 7: Caquetá, 8: Cauca, 9: Cesar, 10: Córdoba,
-- 11: Cundinamarca, 12: Chocó, 13: Huila, 14: La Guajira, 15: Magdalena,
-- 16: Meta, 17: Nariño, 18: Norte de Santander, 19: Quindío, 20: Risaralda,
-- 21: Santander, 22: Sucre, 23: Tolima, 24: Valle del Cauca

-- ANTIOQUIA (1)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Medellín', '05001', 1, 1),
('Bello', '05088', 1, 1),
('Itagüí', '05360', 1, 1),
('Envigado', '05266', 1, 1),
('Apartadó', '05045', 1, 1),
('Turbo', '05837', 1, 1),
('Rionegro', '05615', 1, 1),
('Caucasia', '05154', 1, 1),
('Sabaneta', '05631', 1, 1),
('La Estrella', '05380', 1, 1);

-- ATLÁNTICO (2)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Barranquilla', '08001', 2, 1),
('Soledad', '08758', 2, 1),
('Malambo', '08433', 2, 1),
('Sabanalarga', '08638', 2, 1),
('Puerto Colombia', '08573', 2, 1),
('Galapa', '08296', 2, 1),
('Baranoa', '08078', 2, 1),
('Santo Tomás', '08675', 2, 1),
('Palmar de Varela', '08520', 2, 1),
('Candelaria', '08137', 2, 1);

-- BOGOTÁ D.C. (3)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Bogotá D.C.', '11001', 3, 1);

-- BOLÍVAR (4)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Cartagena', '13001', 4, 1),
('Magangué', '13430', 4, 1),
('Turbaco', '13838', 4, 1),
('Arjona', '13052', 4, 1),
('El Carmen de Bolívar', '13244', 4, 1),
('Mompós', '13468', 4, 1),
('Santa Rosa del Sur', '13744', 4, 1),
('Mahates', '13433', 4, 1),
('San Juan Nepomuceno', '13657', 4, 1),
('Simití', '13760', 4, 1);

-- BOYACÁ (5)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Tunja', '15001', 5, 1),
('Duitama', '15238', 5, 1),
('Sogamoso', '15759', 5, 1),
('Chiquinquirá', '15176', 5, 1),
('Paipa', '15531', 5, 1),
('Villa de Leyva', '15407', 5, 1),
('Puerto Boyacá', '15572', 5, 1),
('Moniquirá', '15476', 5, 1),
('Nobsa', '15491', 5, 1),
('Tibasosa', '15806', 5, 1);

-- CALDAS (6)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Manizales', '17001', 6, 1),
('Villamaría', '17873', 6, 1),
('La Dorada', '17380', 6, 1),
('Chinchiná', '17174', 6, 1),
('Riosucio', '17614', 6, 1),
('Anserma', '17042', 6, 1),
('Neira', '17486', 6, 1),
('Aguadas', '17013', 6, 1),
('Palestina', '17524', 6, 1),
('Supía', '17777', 6, 1);

-- CAQUETÁ (7)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Florencia', '18001', 7, 1),
('San Vicente del Caguán', '18753', 7, 1),
('Puerto Rico', '18592', 7, 1),
('El Doncello', '18247', 7, 1),
('Belén de los Andaquíes', '18094', 7, 1),
('Cartagena del Chairá', '18150', 7, 1),
('La Montañita', '18410', 7, 1),
('Curillo', '18205', 7, 1),
('Albania', '18029', 7, 1),
('Morelia', '18479', 7, 1);

-- CAUCA (8)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Popayán', '19001', 8, 1),
('Santander de Quilichao', '19693', 8, 1),
('Puerto Tejada', '19573', 8, 1),
('Patía', '19517', 8, 1),
('Piendamó', '19533', 8, 1),
('Guapi', '19318', 8, 1),
('Miranda', '19455', 8, 1),
('Corinto', '19212', 8, 1),
('Timbío', '19807', 8, 1),
('Silvia', '19743', 8, 1);

-- CESAR (9)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Valledupar', '20001', 9, 1),
('Aguachica', '20011', 9, 1),
('Bosconia', '20060', 9, 1),
('Chimichagua', '20178', 9, 1),
('Curumaní', '20228', 9, 1),
('El Copey', '20238', 9, 1),
('La Paz', '20400', 9, 1),
('Pailitas', '20517', 9, 1),
('Pelaya', '20550', 9, 1),
('San Diego', '20614', 9, 1);

-- CÓRDOBA (10)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Montería', '23001', 10, 1),
('Cereté', '23162', 10, 1),
('Lorica', '23417', 10, 1),
('Sahagún', '23660', 10, 1),
('Montelíbano', '23466', 10, 1),
('Tierralta', '23807', 10, 1),
('Planeta Rica', '23555', 10, 1),
('Ayapel', '23068', 10, 1),
('Ciénaga de Oro', '23189', 10, 1),
('San Pelayo', '23686', 10, 1);

-- CUNDINAMARCA (11)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Soacha', '25754', 11, 1),
('Facatativá', '25269', 11, 1),
('Zipaquirá', '25899', 11, 1),
('Chía', '25175', 11, 1),
('Fusagasugá', '25290', 11, 1),
('Girardot', '25307', 11, 1),
('Madrid', '25430', 11, 1),
('Mosquera', '25473', 11, 1),
('Funza', '25286', 11, 1),
('Cajicá', '25126', 11, 1);

-- CHOCÓ (12)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Quibdó', '27001', 12, 1),
('Istmina', '27361', 12, 1),
('Condoto', '27205', 12, 1),
('Tadó', '27787', 12, 1),
('Acandí', '27006', 12, 1),
('Riosucio', '27615', 12, 1),
('Bahía Solano', '27075', 12, 1),
('Nuquí', '27491', 12, 1),
('Bojayá', '27099', 12, 1),
('El Carmen de Atrato', '27245', 12, 1);

-- HUILA (13)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Neiva', '41001', 13, 1),
('Pitalito', '41551', 13, 1),
('Garzón', '41298', 13, 1),
('La Plata', '41396', 13, 1),
('Campoalegre', '41132', 13, 1),
('Gigante', '41306', 13, 1),
('Palermo', '41524', 13, 1),
('San Agustín', '41668', 13, 1),
('Rivera', '41615', 13, 1),
('Aipe', '41016', 13, 1);

-- LA GUAJIRA (14)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Riohacha', '44001', 14, 1),
('Maicao', '44430', 14, 1),
('Uribia', '44847', 14, 1),
('Manaure', '44560', 14, 1),
('Albania', '44035', 14, 1),
('Fonseca', '44279', 14, 1),
('Villanueva', '44874', 14, 1),
('San Juan del Cesar', '44650', 14, 1),
('Distracción', '44090', 14, 1),
('Dibulla', '44078', 14, 1);

-- MAGDALENA (15)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Santa Marta', '47001', 15, 1),
('Ciénaga', '47189', 15, 1),
('Fundación', '47288', 15, 1),
('Zona Bananera', '47980', 15, 1),
('Plato', '47555', 15, 1),
('El Banco', '47245', 15, 1),
('Aracataca', '47053', 15, 1),
('Pivijay', '47551', 15, 1),
('Sabanas de San Ángel', '47660', 15, 1),
('Santa Ana', '47692', 15, 1);

-- META (16)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Villavicencio', '50001', 16, 1),
('Acacías', '50006', 16, 1),
('Granada', '50318', 16, 1),
('Puerto López', '50568', 16, 1),
('San Martín', '50689', 16, 1),
('Restrepo', '50606', 16, 1),
('Cumaral', '50226', 16, 1),
('Puerto Gaitán', '50577', 16, 1),
('La Macarena', '50350', 16, 1),
('Guamal', '50325', 16, 1);

-- NARIÑO (17)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Pasto', '52001', 17, 1),
('Tumaco', '52835', 17, 1),
('Ipiales', '52356', 17, 1),
('Túquerres', '52838', 17, 1),
('La Unión', '52399', 17, 1),
('Samaniego', '52678', 17, 1),
('Sandoná', '52683', 17, 1),
('Barbacoas', '52083', 17, 1),
('La Cruz', '52381', 17, 1),
('Ricaurte', '52621', 17, 1);

-- NORTE DE SANTANDER (18)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Cúcuta', '54001', 18, 1),
('Ocaña', '54498', 18, 1),
('Villa del Rosario', '54874', 18, 1),
('Los Patios', '54405', 18, 1),
('Pamplona', '54518', 18, 1),
('Tibú', '54810', 18, 1),
('El Zulia', '54261', 18, 1),
('Puerto Santander', '54553', 18, 1),
('Convención', '54206', 18, 1),
('Sardinata', '54720', 18, 1);

-- QUINDÍO (19)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Armenia', '63001', 19, 1),
('Calarcá', '63130', 19, 1),
('Circasia', '63190', 19, 1),
('La Tebaida', '63401', 19, 1),
('Montenegro', '63470', 19, 1),
('Quimbaya', '63594', 19, 1),
('Salento', '63690', 19, 1),
('Filandia', '63272', 19, 1),
('Génova', '63302', 19, 1),
('Pijao', '63548', 19, 1),
('Córdoba', '63212', 19, 1),
('Buenavista', '63111', 19, 1);

-- RISARALDA (20)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Pereira', '66001', 20, 1),
('Dosquebradas', '66170', 20, 1),
('La Virginia', '66400', 20, 1),
('Santa Rosa de Cabal', '66682', 20, 1),
('Marsella', '66456', 20, 1),
('Belén de Umbría', '66088', 20, 1),
('Apía', '66045', 20, 1),
('Santuario', '66687', 20, 1),
('Pueblo Rico', '66572', 20, 1),
('Quinchía', '66594', 20, 1);

-- SANTANDER (21)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Bucaramanga', '68001', 21, 1),
('Floridablanca', '68276', 21, 1),
('Girón', '68307', 21, 1),
('Piedecuesta', '68547', 21, 1),
('Barrancabermeja', '68081', 21, 1),
('San Gil', '68679', 21, 1),
('Socorro', '68770', 21, 1),
('Málaga', '68444', 21, 1),
('Barbosa', '68077', 21, 1),
('Vélez', '68855', 21, 1);

-- SUCRE (22)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Sincelejo', '70001', 22, 1),
('Corozal', '70215', 22, 1),
('Sampués', '70708', 22, 1),
('San Marcos', '70742', 22, 1),
('Tolú', '70820', 22, 1),
('Majagual', '70429', 22, 1),
('San Onofre', '70713', 22, 1),
('Sincé', '70771', 22, 1),
('San Pedro', '70717', 22, 1),
('Morroa', '70508', 22, 1);

-- TOLIMA (23)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Ibagué', '73001', 23, 1),
('Espinal', '73268', 23, 1),
('Melgar', '73449', 23, 1),
('Honda', '73349', 23, 1),
('Chaparral', '73168', 23, 1),
('Líbano', '73411', 23, 1),
('Mariquita', '73443', 23, 1),
('Purificación', '73555', 23, 1),
('Flandes', '73275', 23, 1),
('Cajamarca', '73124', 23, 1);

-- VALLE DEL CAUCA (24)
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) VALUES
('Cali', '76001', 24, 1),
('Palmira', '76520', 24, 1),
('Buenaventura', '76109', 24, 1),
('Tuluá', '76834', 24, 1),
('Buga', '76111', 24, 1),
('Cartago', '76147', 24, 1),
('Jamundí', '76364', 24, 1),
('Yumbo', '76892', 24, 1),
('Sevilla', '76736', 24, 1),
('Candelaria', '76130', 24, 1);

-- AMAZONAS (25) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Leticia', '91001', 25, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 25);

-- ARAUCA (26) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Arauca', '81001', 26, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 26);

-- CASANARE (27) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Yopal', '85001', 27, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 27);

-- GUAINÍA (28) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Inírida', '94001', 28, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 28);

-- GUAVIARE (29) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'San José del Guaviare', '95001', 29, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 29);

-- PUTUMAYO (30) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Mocoa', '86001', 30, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 30);

-- SAN ANDRÉS (31) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'San Andrés', '88001', 31, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 31);

-- VAUPÉS (32) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Mitú', '97001', 32, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 32);

-- VICHADA (33) - Si existe
INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
SELECT 'Puerto Carreño', '99001', 33, 1 WHERE EXISTS (SELECT 1 FROM departamentos WHERE departamentoId = 33);
