begin;

create schema if not exists private;

create table if not exists private.usuario_credenciales (usuario_id bigint primary key references public.usuarios(id) on delete cascade, password_hash text not null, token_recuperacion text, token_expiracion timestamptz, token_verificacion text);

delete from public.tarea_registros;

delete from public.mensajes;

delete from public.tareas;

delete from public.incidencias;

delete from public.equipos;

delete from public.usuarios;

delete from public.centros_coste;

delete from private.usuario_credenciales;

insert into public.centros_coste (id, nombre) values

(1, 'Oficina Principal'),
(2, 'Taller'),
(3, 'Administracion'),
(4, 'Opel'),
(5, 'Omoda'),
(6, 'MG'),
(7, 'Changan'),
(9, 'Financiación'),
(11, 'Lepas');

insert into public.usuarios (id, nombre, email, rol, fecha_creacion, estado_cuenta, ultima_actividad, telefono, movil, portatil, telefono_pendiente, movil_pendiente, portatil_pendiente, estado_material, centro_coste_id, puesto, departamento) values

(1, 'FRANCISCO JAVIER RAMÍREZ CERDA', 'informatica@rebios.info', 'admin', '2026-08-04 11:59:38', 'activo', '2026-08-06 18:12:50', '', '', '', NULL, NULL, NULL, 'validado', 1, NULL, NULL),
(13, 'FELIPE CUENCA MUNERA', 'jefeadministracion@borjamotor.com', 'empleado', '2026-08-04 16:17:12', 'activo', '2026-08-04 19:27:52', '664371800', 'NOKIA MODEL TA-1334', '', NULL, NULL, NULL, 'validado', 3, NULL, NULL),
(14, 'NAYRA MUELAS', 'administracion4@borjamotor.com', 'empleado', '2026-08-04 16:17:53', 'activo', '2026-08-04 18:21:51', '666578602', 'SAMSUNG GALAXY A16 S/N RFGL43534XM', '', NULL, NULL, NULL, 'validado', 3, NULL, NULL),
(17, 'JUAN CARLOS BELLIDO MARTÍNEZ', 'opel@borjamotor.com', 'empleado', '2026-08-05 06:02:25', 'activo', '2026-08-05 16:33:43', NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 3, NULL, NULL),
(18, 'JORGE ALCARAZ', 'nomina@rebios.info', 'controller', '2026-08-05 06:38:32', 'activo', '2026-08-05 09:53:39', NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 1, NULL, NULL),
(19, 'JOSE ANTONIO BARBA SORIANO', 'vo.admon@borjamotor.com', 'empleado', '2026-08-05 08:00:56', 'activo', '2026-08-06 16:48:51', '670059836 / 3809', '', 'ACER ASPIRE 3 15 / S/N: NXKSJEB01U4500632E3400', NULL, NULL, NULL, 'validado', 4, '', ''),
(20, 'ROCIO PALMA VILAR', 'financiacion@borjamotor.com', 'empleado', '2026-08-05 08:05:06', 'activo', '2026-08-05 10:09:35', '634 64 11 32', 'REALME NOTE 70T 007519090c2cd9d', 'lenovo ideapad slim 3 PF5JE5WD', NULL, NULL, NULL, 'validado', 9, NULL, NULL),
(21, 'MOHAMED AOUN SAADI', 'ventas7@borjamotor.com', 'empleado', '2026-08-05 08:20:10', 'activo', '2026-08-05 12:56:42', '672200892', 'REDMI 13 MIDNIGHT BLACK
SN: 55572/W4UQ01746', '', NULL, NULL, NULL, 'validado', 6, NULL, NULL),
(22, 'SEBASTIAN SANGUINO', 'ventas@changanborjamotor.es', 'empleado', '2026-08-05 08:31:09', 'activo', '2026-08-06 17:02:21', NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 7, NULL, NULL),
(23, 'RAÚL PALOMINO SALAZAR', 'gerencia@changanborjamotor.es', 'empleado', '2026-08-05 08:34:40', 'activo', '2026-08-05 10:36:30', '664372368', '', 'LENOVO 5000 SERIES 7 A8246953-BFD0-44D3-9F74-BD734574FDC0', NULL, NULL, NULL, 'validado', 7, NULL, NULL),
(24, 'GUILLERMO GARCÍA YAGO', 'flotas@borjamotor.com', 'empleado', '2026-08-05 08:38:48', 'activo', '2026-08-06 18:12:35', '607764887 / 3825', '', 'ACER ASPIRE 315 (N22C6) S/N: NXKSJEB01U4500617A3400', NULL, NULL, NULL, 'validado', 4, NULL, NULL),
(25, 'ANTONIO MARTINEZ', 'postventa@borjamotor.com', 'empleado', '2026-08-05 08:44:01', 'activo', '2026-08-05 11:47:57', NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 2, NULL, NULL),
(26, 'VÍCTOR SACRISTÁN MARÍN', 'administracion5@borjamotor.com', 'empleado', '2026-08-05 08:44:14', 'activo', '2026-08-06 12:13:02', '666574585', 'SAMSUNG GALAXY A16 - RFGL40G1KNK', '', NULL, NULL, NULL, 'validado', 3, NULL, NULL),
(27, 'PABLO PEREZ MARCO', 'villena1@borjamotor.com', 'empleado', '2026-08-05 08:45:03', 'activo', '2026-08-05 11:51:40', '3882   661776635', 'Redmi 12C    IMEI: 869601062790873', 'HP 250 G8 Notebook Pc   SN: CND150511TV', NULL, NULL, NULL, 'validado', 6, NULL, NULL),
(29, 'CARLA VILANOVA BERENSTEIN', 'ventas4@borjamotor.com', 'empleado', '2026-08-05 08:45:45', 'activo', '2026-08-05 12:21:47', '663901585', 'Realme Note 60, IMEI 868735078382274', 'Alurin, ALU-BAR-R757-000-156, SN EMNP15AL525G43940050', NULL, NULL, NULL, 'validado', 4, NULL, NULL),
(30, 'JOAQUIN GALLARDO PICO', 'administracion@borjamotor.com', 'empleado', '2026-08-05 08:48:52', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 3, NULL, NULL),
(31, 'SERGIO TORTOSA', 'ventas1@changanborjamotor.es', 'empleado', '2026-08-05 08:51:51', 'activo', '2026-08-05 10:54:45', '662294065', 'Realme Note 70T - S/N: 007519400a150294', 'Acer Aspire AG15-42P-R7GF - S/N:NXJ7WEB00Y538010F33400', NULL, NULL, NULL, 'validado', 7, NULL, NULL),
(32, 'JOSE DAVID GARCIA', 'ventas1@omodaborjamotor.es', 'empleado', '2026-08-05 08:57:05', 'activo', '2026-08-05 12:56:51', '672202166', 'REALME RMX3933 0E64C19G271044E8', 'LENOVO IDEAPAD 1 15ALC7 PF4322QG', NULL, NULL, NULL, 'validado', 5, NULL, NULL),
(33, 'JOSE ANTONIO CASTELL', 'benidorm4@borjamotor.com', 'empleado', '2026-08-05 09:07:17', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 6, NULL, NULL),
(34, 'CARLOS ELOY TÉLLEZ DE LA TORRE', 'benidorm3@borjamotor.com', 'empleado', '2026-08-05 09:07:58', 'activo', '2026-08-05 11:14:01', NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 6, NULL, NULL),
(35, 'NEREA ROS BLAS', 'elche3@borjamotor.com', 'empleado', '2026-08-05 09:32:57', 'activo', '2026-08-05 12:14:34', '653777353', 'Xiaomi, Redmi 14C, SN:59170/64YF00431', 'HP Laptop 17-cp2003ns // RMN: TPN-I140 // SN#5CG5070F9H', NULL, NULL, NULL, 'validado', 6, NULL, NULL),
(36, 'MARINA ARIANA BACIU', 'ventasinternet2@borjamotor.com', 'empleado', '2026-08-05 10:05:21', 'activo', NULL, '', 'RMX3933 // 860118072339194', 'HP // 5CD5104J79', NULL, NULL, NULL, 'validado', 6, NULL, NULL),
(37, 'NAYARA ORTS MATEOS', 'elche2@borjamotor.com', 'empleado', '2026-08-05 10:26:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 3, NULL, NULL),
(39, 'ISABELA LEÓN RUIZ', 'ventas3@borjamotor.com', 'empleado', '2026-08-05 10:44:27', 'activo', '2026-08-05 12:53:34', '687576093 / 3136', 'Samsung Galaxy A16 - S/N: R5GL54HH23Y', 'HP - CND3373LVX', NULL, NULL, NULL, 'validado', 4, NULL, NULL),
(60, 'FEDERICO MAIARU', 'admInistracion2@borjamotor.com', 'empleado', '2026-08-10 06:54:20', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 3, NULL, NULL),
(61, 'JUAN JOSÉ GARCIA', 'administracion3@borjamotor.com', 'empleado', '2026-08-11 06:22:15', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 3, NULL, NULL),
(62, 'JOSE PLANELLES', 'gerencia@omodaborjamotor.es', 'empleado', '2026-08-17 10:33:29', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, NULL, NULL),
(64, 'ESTEBAN', 'esteban@rebios.info', 'auditor', '2026-08-25 07:04:59', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 1, NULL, NULL),
(65, 'JAVIER GRANIZO LOBO', 'gerencia@lepasborjamotor.es', 'empleado', '2026-09-01 11:54:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 11, 'Jefe de Ventas', 'Ventas'),
(66, 'RAUL VAZQUEZ MARTINEZ', 'gerencia@borjamotor.com', 'empleado', '2026-09-01 15:19:52', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 4, 'Gerente', 'Ventas'),
(67, 'Marcos Ruiz Garcia', 'ventas5@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(68, 'Alex Lafuente Morales', 'ventas@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(69, 'Joaquin Garcia Marin', 'ventas2@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(70, 'Estela Richart Ramos', 'ventas6@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(71, 'Maria Jezabel Hidalgo Perez', 'ventas4@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(72, 'Coral Manzano Vila', 'ventas7@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(73, 'Carlos Frances San Narciso', 'ventas3@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(74, 'Carla Box Lacquemant', 'info@omodaborjamotor.es', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 5, 'Asesor Comercial', 'Ventas'),
(75, 'Adrian Galipienso Perez', 'recambios1@borjamotor.com', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 2, 'Recambios', ''),
(76, 'Raquel Roman Garcia', 'recambios2@borjamotor.com', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 2, 'Taller', 'Recambios'),
(77, 'Victor Gabriel Sanchez Mas', 'recambios@borjamotor.com', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 2, 'Taller', 'Recambios'),
(78, 'Raul Lopez Gonzalez', 'benidorm1@borjamotor.com', 'empleado', '2026-09-01 16:15:38', 'activo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sin_datos', 6, 'Asesor Comercial', 'Ventas');

insert into public.equipos (id, tipo, marca, modelo, identificador, centro_coste_id, usuario_id, estado_equipo, observaciones, fecha_alta) values

(1, 'portatil', 'HP', 'OMNIBOOK 3', '5CD6117PBY', 11, 65, 'asignado', NULL, '2026-09-01 17:25:54'),
(2, 'portatil', 'LENOVO', 'IDEAPAD 1 15ALC7', 'PF4166NR', 5, 32, 'asignado', NULL, '2026-09-01 18:15:37'),
(3, 'portatil', 'HP', '15-FD0022NS', '1H85032Y99', 5, 67, 'asignado', NULL, '2026-09-01 18:15:38'),
(4, 'portatil', 'LENOVO', '15ALC7', 'SNPF4166QE', 5, 68, 'asignado', NULL, '2026-09-01 18:15:38'),
(5, 'portatil', 'LENOVO', 'IDEAPAD 1 15ALC7', 'PF415ZY8', 5, 69, 'asignado', NULL, '2026-09-01 18:15:38'),
(6, 'portatil', 'HP', '15-FD0022NS', '1H85032Y8', 5, 70, 'asignado', NULL, '2026-09-01 18:15:38'),
(7, 'portatil', 'ACER', 'N22C6', 'NXKSJEB01U437031813400', 5, 71, 'asignado', NULL, '2026-09-01 18:15:38'),
(8, 'portatil', 'ACER', 'N22C6', 'NXKSJEB02H4270514F3400', 5, 72, 'asignado', NULL, '2026-09-01 18:15:38'),
(9, 'portatil', 'LENOVO', 'V15G4IAH', 'PF4KENB5', 5, 73, 'asignado', NULL, '2026-09-01 18:15:38'),
(10, 'movil', 'REALME', 'NOTE 60', '860118071696438', 5, 32, 'asignado', NULL, '2026-09-01 18:15:38'),
(11, 'movil', 'REALME', 'NOTE 60', '860118071716178', 5, 68, 'asignado', NULL, '2026-09-01 18:15:38'),
(12, 'movil', 'REALME', 'NOTE 50', '861206073519416', 5, 69, 'asignado', NULL, '2026-09-01 18:15:38'),
(13, 'movil', 'REALME', 'NOTE 60', '860118071709595', 5, 70, 'asignado', NULL, '2026-09-01 18:15:38'),
(14, 'movil', 'REALME', 'NOTE 60', '868735078399518', 5, 71, 'asignado', NULL, '2026-09-01 18:15:38'),
(15, 'movil', 'REALME', 'NOTE 60', '860118071693831', 5, 72, 'asignado', NULL, '2026-09-01 18:15:38'),
(16, 'movil', 'REDMI', '12', '866672069841723', 5, 73, 'asignado', NULL, '2026-09-01 18:15:38'),
(17, 'movil', 'NOKIA', 'G10 DS BLUE', '358078149829024', 2, 75, 'asignado', NULL, '2026-09-01 18:15:38'),
(18, 'movil', 'NOKIA', 'G10 DS BLUE', '358078149827085', 3, 13, 'asignado', NULL, '2026-09-01 18:15:38'),
(19, 'movil', 'VIVO', 'YO 1', '866328051382214', 3, 17, 'asignado', NULL, '2026-09-01 18:15:38'),
(20, 'movil', 'REDMI', '12C', '866257064774200', 2, 76, 'asignado', NULL, '2026-09-01 18:15:38'),
(21, 'portatil', 'ACER', 'N22C6', 'NXKSJEB01U437031E23400', 6, 66, 'asignado', NULL, '2026-09-01 18:15:38'),
(22, 'portatil', 'LENOVO', '15IRH8', 'PF5JE5WD', 3, 20, 'asignado', NULL, '2026-09-01 18:15:38'),
(23, 'movil', 'REALME', 'NOTE 60', '860118070403018', 2, 77, 'asignado', NULL, '2026-09-01 18:15:38'),
(24, 'portatil', 'ACER', 'N22C6', 'NXKSJEB03R45109CBD3400', 7, 22, 'asignado', NULL, '2026-09-01 18:15:38'),
(25, 'portatil', 'LENOVO', 'V15 G3 ABA', 'PF48ABFW', 7, 23, 'asignado', NULL, '2026-09-01 18:15:38'),
(26, 'portatil', 'LENOVO', 'IDEAPAD 1 15ALCL7', 'PF4322QG', 7, 31, 'asignado', NULL, '2026-09-01 18:15:38'),
(27, 'portatil', 'LENOVO', '15ITL6', 'PF2RCZ2X', 2, 25, 'asignado', NULL, '2026-09-01 18:15:38'),
(28, 'portatil', 'ACER', 'N22C6', 'NXKSJEB001U450060C53400', 2, 25, 'asignado', NULL, '2026-09-01 18:15:38'),
(29, 'portatil', 'ALURIN', 'PLEX ADVANCE', 'EMMP15AL525G43940098', 2, 25, 'asignado', NULL, '2026-09-01 18:15:38'),
(30, 'portatil', 'ASUS', 'F1605P', 'NCN0CV076468508', 2, 25, 'asignado', NULL, '2026-09-01 18:15:38'),
(31, 'movil', 'VIVO', 'YO 1', '866328051383022', 3, 30, 'asignado', NULL, '2026-09-01 18:15:38'),
(32, 'movil', 'REDMI', '12C OCEAN BLUE', '869601062172247', 3, 61, 'asignado', NULL, '2026-09-01 18:15:38'),
(33, 'movil', 'REALME', 'C51 6GB/256GB', '865528063115236', 3, 60, 'asignado', NULL, '2026-09-01 18:15:38'),
(34, 'portatil', 'ACER', 'N22C6', 'NXKSJEB01U4500632E3400', 4, 19, 'asignado', NULL, '2026-09-01 18:15:38'),
(35, 'portatil', 'ACER', 'N22C6', 'NXKSJEB01U4500617A3400', 4, 24, 'asignado', NULL, '2026-09-01 18:15:38'),
(36, 'portatil', 'ALURIN', 'FLEX ADVANCE', 'EMNP15AL523G43940050', 4, 29, 'asignado', NULL, '2026-09-01 18:15:38'),
(37, 'portatil', 'LENOVO', '15ALC6', 'PF3L9E', 6, 78, 'asignado', NULL, '2026-09-01 18:15:38'),
(38, 'portatil', 'HP', '15-FC0089NS', '5CD5104J79', 6, 36, 'asignado', NULL, '2026-09-01 18:23:42'),
(39, 'movil', 'REALME', 'NOTE 60', '860118072339194', 6, 36, 'asignado', NULL, '2026-09-01 18:24:00');

insert into public.incidencias (id, titulo, descripcion, estado, usuario_id, fecha_creacion, eliminado) values

(16, 'ORDENADOR DE SERGIO', 'NO FUNCIONA BIEN', 'resuelta', 25, '2026-08-05 09:22:35', false),
(17, 'ORDENADOR RECAMBIOS GALI NO FUNCIONA', 'RECAMBIOS', 'resuelta', 25, '2026-08-05 09:22:51', false),
(18, 'Cambio', 'Buenos días, 
Te he mandado la solicitud con todos los datos, y necesito modificar el nombre.

Mi nombre completo es Pablo Pérez Marco.

Un saludo.', 'resuelta', 27, '2026-08-05 09:37:02', false),
(22, 'NO ME LLEGAN LOS CORREOS DE LA GESTORIA', 'No me llegan los correos de la gestoría y me dicen que debe ser problema nuestro ya que a todos les llegan menos a mi', 'resuelta', 17, '2026-08-05 13:44:07', false),
(26, 'CORREO EN MOVIL', 'Hola Fran, la semana que viene me voy de vacaciones y me gustaría tener el correo del trabajo en el movil como hicimos el año pasado para poder ir revisando por si hubiera algo urgente.', 'resuelta', 13, '2026-08-05 17:08:01', false),
(27, 'CORREO LLENO', 'No me llega ningún correo.', 'resuelta', 26, '2026-08-06 06:12:47', false),
(28, 'plataforma de neumaticos', 'no funciona en ningun ordenador de recepcion. pero en el de galipienso si que va...es raro.', 'resuelta', 25, '2026-08-06 06:57:56', false),
(36, 'Customer First Isabela Leon', 'Buenas! El martes me enviasteis el usuario y contraseña de Isabela (el largo), al intentar entrar le pidió cambiar la clave y ya no le deja, le aparece este error que os adjunto, además tampoco tenemos el corto, me podéis echar un cable?', 'resuelta', 19, '2026-08-06 14:36:49', false),
(38, 'IMPRESORA Y ESCANER', 'Cambiar el acceso a la impresora y escaner', 'resuelta', 22, '2026-08-06 14:45:12', false),
(39, 'PROBLEMA DF SERVER VN OPEL', 'Buenas tardes, no me suben los expedientes al DF SERVER 
OPEL VN.
Estoy intentando subir un pedido de ANA LUCIO RODENAS.

Gracias.', 'resuelta', 24, '2026-08-06 15:03:32', false),
(40, 'IMPRESORA Y ESCANER', 'qw', 'en_proceso', 1, '2026-08-06 16:23:45', false),
(50, 'INTERNET SALA MG', 'Buenos días,

En la mesa 2 de la exposición de MG no hay internet. Hay que volver a conectar el cable desde la mesa 1.

Tenemos a un comercial sin poder trabajar de momento', 'resuelta', 21, '2026-08-10 07:42:57', false),
(51, 'CORREO LLENO', 'Buenas, 
Me sigue saliendo como que tengo el correo lleno, cuando me mandan un correo les sale el siguiente mensaje.', 'resuelta', 26, '2026-08-13 08:10:10', false),
(52, 'PORTATIL ACER', 'AL SACAR DESDE EL PROGRAMA DE DIAGNOSIS  VDS UN PDF SE CIERRA EL PROGRAMA.', 'resuelta', 25, '2026-08-13 13:28:09', false),
(53, 'CORREO LLENO', 'Buenas Fran, sigo teniendo el mismo problema que no me llegan', 'resuelta', 26, '2026-08-13 13:48:34', false),
(54, 'No me funciona Excel ni Word', 'Buenas,
No me funciona ni excel ni word, me dice que lo tengo sin licencia,
¿Podéis ayudarme? Adjunto foto
Gracias,
Jose', 'resuelta', 19, '2026-08-13 14:09:10', false),
(55, 'Prueba', 'Prueba', 'resuelta', 62, '2026-08-17 10:39:29', false),
(56, 'busqueda en carpetas no funciona', 'hola fran, me he dado cuenta que no me funciona la búsqueda de documentos,
antes al momento buscaba y aparecian las facturas y ahora nada', 'resuelta', 13, '2026-08-17 13:03:28', false),
(57, 'busqueda en carpetas no funciona', 'sigue sin ir', 'resuelta', 13, '2026-08-18 05:57:35', false),
(58, 'Nombre correo Walcu', 'He cambiado mi nombre en la configuración de Walcu pero sigue apareciendo Javier Francisco al enviar un correo. Adjunto capturas. ¿Puedes revisarlo, por favor?', 'resuelta', 39, '2026-08-18 08:16:21', false),
(59, 'ORDENADOR DE SERGIO', 'no puede enviar correo electronicos . ni contestarlos', 'resuelta', 25, '2026-08-19 13:25:53', false),
(60, 'busqueda en carpetas no funciona', 'hola fran, he descargado wizfile para poder buscar mas rapidamente, el problema es que para poder buscar en la carpeta del servidor hay que ponerle las credenciales para que pueda acceder a la busqueda', 'resuelta', 13, '2026-08-20 09:09:42', false),
(61, 'SIN INTERNET EXPO MG', 'Tenemos a un comercial sin internet en el ordenador, está sin trabajar desde las 9:00', 'resuelta', 21, '2026-08-21 08:00:34', false),
(62, 'INCIDENCIA DF SERVER Y OUTLOOK', 'Tenemos a un comercial de MG sin DF SERVER ni OUTLOOK desde esta mañana.
No sabemos qué ocurre', 'resuelta', 21, '2026-08-24 16:55:48', false),
(63, 'No me deja exportar Excel', 'Buenas! No me deja exportar en PDF desde excel los stocks, me podeis ayudar? Os mando pantallazo.', 'resuelta', 19, '2026-08-28 15:13:27', false),
(64, 'la carpeta de pdf no funciona', 'no nos funciona a ninguno', 'resuelta', 13, '2026-08-31 10:10:44', false),
(65, 'DUDAS DFSERVER', 'Buenas, necesito hablar con alguno de vosotros para poder solucionar unas incidencias en los expedientes que hago para los compraventas,
Por favor, llamarme al 670.059.836
Gracias', 'resuelta', 19, '2026-09-01 09:11:08', false),
(66, 'CAMBIO DE PERSONAL', 'ESTHER YA NO ESTA. TENIA ESTE MAIL Esther <esther@borjamotor.com>
AHORA LA CHICA SE LLAMA REBECA. LO CAMBIAMOS?DEJAMOS EL MISMO? LO ENLAZAS?', 'resuelta', 25, '2026-09-01 09:32:04', false),
(67, 'ordenador sobremesa', 'ordenador sobremesa del taller no funciona el del carrito, no enciende.', 'en_proceso', 25, '2026-09-01 09:45:51', false),
(68, 'NO PUEDO ABRIR EL CORREO', 'Buenas tardes Fran, no me deja abrir el correo, supongo que será algo del servidor ya que mi correo va ligado creo', 'resuelta', 17, '2026-09-01 13:33:33', false),
(69, 'CAMBIAR ORDENADOR', 'Hola Fran! Cuando puedas hazme el cambio de un ordenador por otro por favor', 'en_proceso', 22, '2026-09-07 11:54:22', false),
(70, 'outlook en telefono movil', 'Buenas tardes, quiero recibir los correos electronicos tambien en el telefono movil, guardando la configuracion de contactos y carpetas del pc.

Gracias', 'en_proceso', 65, '2026-09-08 15:01:40', false);

insert into public.mensajes (id, incidencia_id, usuario_id, mensaje, adjunto, fecha_creacion) values

(21, 18, 1, 'Perfecto, ya te he cambiado el nombre y he aceptado tus datos de material. Te cierro el ticket', NULL, '2026-08-05 10:24:40'),
(22, 22, 1, 'Mándame porfa el correo de la gestoría para ver el dominio.', NULL, '2026-08-05 14:02:40'),
(24, 22, 17, 'Es el correo de A9, donde nos llegan todas las matriculas
A9 <no-reply@gaa9.com>', NULL, '2026-08-05 14:06:18'),
(26, 22, 1, 'La empresa que nos lleva el servicio de correo está cerrada, abren de 8am a 14pm.

Por descartar cosas, al resto les llegan los correos? o no os llegan a ninguno?

Mira a ver si pueden hacer una prueba y mandarte un correo directamente a ti, ya que creo recordar que esos avisos los mandaban automaticamente a traves de una aplicacion', NULL, '2026-08-05 14:14:41'),
(27, 22, 17, 'Los A9 les llega a todos menos a mi..
Les digo que me hagan la prueba y te digo algo a ver', NULL, '2026-08-05 14:33:39'),
(28, 26, 1, 'Claro sin problema, luego bajo a configurartelo', NULL, '2026-08-06 10:04:46'),
(29, 22, 1, 'Buenas Juan Carlos, me dicen desde Lobocom que ahora deberían llegar.
Confirmame que ahora funciona todo bien', NULL, '2026-08-06 10:05:38'),
(30, 28, 1, 'OK en poder bajo a revisarlo', NULL, '2026-08-06 10:05:59'),
(31, 27, 1, 'Buenas, ayer le mandé un correo a Felipe avisando.

Revisé tu correo y efectivamente lo tienes lleno, pero si te borro yo cosas las vas a perder. Tienes que ir borrando el correo que no necesites.

Si es necesario, te puedo crear un archivo en Outlook para que vayas archivando el correo.', NULL, '2026-08-06 10:07:36'),
(32, 27, 26, 'Buenas, 

Si puedes crearme un archivo en outlook donde pueda archivar el correo mejor, porque antes ya he borrado correos y el resto que tengo son importantes.', NULL, '2026-08-06 10:12:28'),
(38, 22, 1, 'Hemos revisado el servidor y está todo correcto. He hablado con Felipe y me ha dicho que tiene una regla creada para poder reenviarte los correos. En principio funciona todo bien y seguramente tengan ellos un problema con el robot que manda los avisos, ya que a Nayra le llegan los correos duplicados', NULL, '2026-08-06 11:33:32'),
(40, 36, 1, 'Te vuelvo a abrir el ticket que lo he eliminado sin querer (todavía no me he acostumbrado a esto)

El usuario corto es el DR19078, contraseña D43blq2F.

Tiene que cambiarle primero la contrseña entrando al passweb https://passweb.mpsa.com/index.

Si no le deja entrar al C1st con el largo, que pruebe con este pero en teoria solo se tiene que usar el largo', NULL, '2026-08-06 14:38:42'),
(41, 28, 1, 'Has podido comprobar lo del usuario de Gali en el PC de Aaron??', NULL, '2026-08-06 14:41:39'),
(42, 38, 1, 'Sebi, dime que es exactamente lo que necesitas', NULL, '2026-08-06 14:45:27'),
(43, 38, 1, 'Necesito que uséis el portal. En el correo que se manda, viene un enlace. accede por ahí porfa porque tengo que llevar un control de todo esto que no sea a través del correo. si no te acuerdas de la contraseña que pusimos el otro día, puedes resetearla desde el login', NULL, '2026-08-06 14:49:20'),
(44, 38, 22, 'Buenas tardes! Necesito que conectes la impresora a la red por favor', NULL, '2026-08-06 15:02:21'),
(45, 39, 1, 'He contactado ya con Ángel.

Te devuelve algun mensaje de error? o simplemente no lo sube', NULL, '2026-08-06 15:56:15'),
(46, 39, 1, 'Me comenta Ángel que si que se ha subido, pero que parece ser que el formato que has subido no es el de siempre.

Habeis cambiado el formato de los pedidos?', NULL, '2026-08-06 16:01:10'),
(47, 39, 1, 'Me comenta Ángel que si que se ha subido, pero que parece ser que el formato que has subido no es el de siempre.

Habeis cambiado el formato de los pedidos?', NULL, '2026-08-06 16:01:10'),
(48, 39, 24, 'El ultimo que he mandado ya era con el formato "normal", el otro formato es para autonomos empresas que en teoria tambien lo cogia antes.', NULL, '2026-08-06 16:10:40'),
(49, 39, 1, 'Vale en principio deberia de salirte ya. Me ha dicho Angel Gomis que para cualquier consulta relacionada con el DF SERVER que los contactes a ellos directamente.', NULL, '2026-08-06 16:11:31'),
(50, 39, 24, 'Ya me sale el pedido en el  DF SERVER. Gracias', NULL, '2026-08-06 16:12:36'),
(51, 28, 1, 'Nada no funciona ni en el PC de Gali. No se que le pasa que a veces si y a veces no. En el resto nunca funciona. He hablado con Ángel para abrir una incidencia con PSA, ya que parece ser que el problema no es nuestro. En saber algo te voy diciendo.', NULL, '2026-08-07 11:23:38'),
(54, 38, 1, 'Ya teneis la impresora configurada por red', NULL, '2026-08-10 10:20:58'),
(55, 51, 26, 'Archivo adjunto subido.', 'adj_6a7d7be2936b9.jpeg', '2026-08-13 08:10:10'),
(56, 51, 1, 'No puedo vaciarte nada del buzón, porque lo que borre te va a desaparecer del correo.

Recuerda que tienes que eliminar los correos que ya no sirvan, o moverlos al archivo para quitarlos del servidor.', NULL, '2026-08-13 10:24:07'),
(57, 54, 19, 'Archivo adjunto subido.', 'adj_6a7dd006c0b52.png', '2026-08-13 14:09:10'),
(58, 54, 1, 'Dale al boton de reactivar que te sale en la barra roja', NULL, '2026-08-13 14:20:00'),
(59, 53, 1, 'Buenas Victor, en el anterior ticket te he comentado que tienes que borrar correos o moverlos al archivo.

No te puedo borrar nada porque lo que me cargue te va a desaparecer', NULL, '2026-08-13 14:21:09'),
(60, 53, 26, 'vale, ¿cuál es la carpeta?', 'adj_6a7dd46a0d5d9.pdf', '2026-08-13 14:27:54'),
(61, 53, 1, 'La que te pone historial, la expandes y ahí puedes crearte las carpetas que necesites y mover el correo', NULL, '2026-08-13 14:34:19'),
(62, 53, 26, 'Vale, ya lo acabo de hacer,gracias', NULL, '2026-08-13 14:36:25'),
(63, 55, 1, 'Prueba :)', NULL, '2026-08-17 10:40:40'),
(64, 55, 1, 'Te cierro el ticket. Si necesitas ver los cerrados, arriba a la izquierda tienes un boton para poder verlos, ya que al cerrarlos desaparecen de la vista principal', NULL, '2026-08-17 10:41:30'),
(65, 56, 13, 'Archivo adjunto subido.', 'adj_6a8306a08725e.png', '2026-08-17 13:03:28'),
(66, 56, 1, 'Es cuestión de reconstruir el índice de Windows. Es una cosa muy sencilla. Ahora bajo a arreglártelo.', NULL, '2026-08-17 15:31:56'),
(67, 57, 1, 'Ok, ahora bajo y lo revisamos', NULL, '2026-08-18 06:14:53'),
(68, 60, 1, 'He revisado el server y resulta que por defecto, no viene instalado el servicio de indexacion. Voy a instalarlo y lo probamos. No me hace mucha gracia que un servicio externo tenga acceso al servidor', NULL, '2026-08-20 14:04:46'),
(69, 59, 1, 'Ya se lo he activado', NULL, '2026-08-20 14:47:32'),
(70, 62, 1, 'Necesito que me amplíes la información. Que significa sin DF SERVER ni Outlook?', NULL, '2026-08-25 06:24:24'),
(71, 62, 21, 'DF SERVER es el programa que utilizamos para matricular. Y el OUTLOOK es el correo coorporativo.
Todo en la cuenta de Hector Requena. Estuvimos intentando entrar ayer y no podíamos', NULL, '2026-08-25 06:55:40'),
(72, 63, 19, 'Archivo adjunto subido.', 'adj_6a91a5972d75f.png', '2026-08-28 15:13:27'),
(73, 63, 1, 'Me puedes decir si es un archivo en red?', NULL, '2026-08-31 06:41:32'),
(74, 64, 13, 'Archivo adjunto subido.', 'adj_6a95532434d34.png', '2026-08-31 10:10:44'),
(75, 64, 1, 'A que te refieres con que no funciona? Yo he podido entrar a la carpeta. El problema es ese o que no os salen los documentos de Autoline?', NULL, '2026-08-31 11:21:25'),
(76, 64, 13, 'perdon, cualquier factura que imprimimos de autoline ya sea por vehículos, informes etcc no sale nada', NULL, '2026-08-31 11:23:31'),
(77, 64, 1, 'Contactar directamente a Ángel Gomis. Yo no puedo acceder a la configuracion de Autoline.', NULL, '2026-08-31 11:26:11'),
(78, 65, 1, 'Jose, esto es solo para mi. Si necesitas hablar con Ángel Gomis o Sergio, mandales un correo a informatica@hmcrespo.es', NULL, '2026-09-01 10:48:31'),
(79, 68, 17, 'Archivo adjunto subido.', 'adj_6a96d42dd83f7.png', '2026-09-01 13:33:33'),
(80, 68, 1, 'Reinicia el PC, ese fallo es normalmente porque falla la conexion con el servidor. Normalmente reiniciando se soluciona', NULL, '2026-09-01 14:03:44'),
(81, 68, 17, 'Ya me deja entrar, gracias!!', NULL, '2026-09-01 14:22:30'),
(82, 66, 1, 'Ya tenemos el nuevo correo administraciontaller2@borjamotor.com', NULL, '2026-09-02 07:00:01'),
(83, 66, 25, 'gracias. enviado a woice ya. cuando puedas. ponselo en el pc', NULL, '2026-09-02 07:10:23'),
(84, 67, 25, 'no da video la pantalla , deber ser el cable porque no va ni en la grafica ni en la normal.', NULL, '2026-09-02 12:49:59');

insert into public.tareas (id, nombre, descripcion, incidencia_id, estado, fecha_creacion, fecha_cierre, centro_coste_id, eliminado) values

(7, 'ORDENADOR DE SERGIO', 'NO FUNCIONA BIEN', 16, 'cerrada', '2026-08-05 09:22:35', '2026-08-13 16:22:01', 2, false),
(8, 'ORDENADOR RECAMBIOS GALI NO FUNCIONA', 'RECAMBIOS', 17, 'cerrada', '2026-08-05 09:22:51', '2026-08-14 16:26:19', 2, false),
(9, 'Cambio', 'Buenos días, 
Te he mandado la solicitud con todos los datos, y necesito modificar el nombre.

Mi nombre completo es Pablo Pérez Marco.

Un saludo.', 18, 'cerrada', '2026-08-05 09:37:02', '2026-08-06 16:08:19', 6, false),
(13, 'NO ME LLEGAN LOS CORREOS DE LA GESTORIA', 'No me llegan los correos de la gestoría y me dicen que debe ser problema nuestro ya que a todos les llegan menos a mi', 22, 'cerrada', '2026-08-05 13:44:07', '2026-08-06 16:04:04', 3, false),
(17, 'CORREO EN MOVIL', 'Hola Fran, la semana que viene me voy de vacaciones y me gustaría tener el correo del trabajo en el movil como hicimos el año pasado para poder ir revisando por si hubiera algo urgente.', 26, 'cerrada', '2026-08-05 17:08:01', '2026-08-06 16:04:07', 3, false),
(18, 'CORREO LLENO', 'No me llega ningún correo.', 27, 'cerrada', '2026-08-06 06:12:47', '2026-08-06 16:04:11', 3, false),
(19, 'plataforma de neumaticos', 'no funciona en ningun ordenador de recepcion. pero en el de galipienso si que va...es raro.', 28, 'cerrada', '2026-08-06 06:57:56', '2026-08-10 12:20:32', 2, false),
(21, 'Customer First Isabela Leon', 'Buenas! El martes me enviasteis el usuario y contraseña de Isabela (el largo), al intentar entrar le pidió cambiar la clave y ya no le deja, le aparece este error que os adjunto, además tampoco tenemos el corto, me podéis echar un cable?', 36, 'cerrada', '2026-08-06 10:54:25', '2026-08-10 12:21:30', 4, false),
(33, 'IMPRESORA Y ESCANER', 'Cambiar el acceso a la impresora y escaner', 38, 'cerrada', '2026-08-06 14:45:12', '2026-08-10 12:22:10', 7, false),
(35, 'PROBLEMA DF SERVER VN OPEL', 'Buenas tardes, no me suben los expedientes al DF SERVER 
OPEL VN.
Estoy intentando subir un pedido de ANA LUCIO RODENAS.

Gracias.', 39, 'cerrada', '2026-08-06 15:03:32', '2026-08-06 18:13:20', 4, false),
(36, 'IMPRESORA Y ESCANER', 'qw', 40, 'abierta', '2026-08-06 16:23:45', NULL, 1, false),
(37, 'Problema con autoline', 'PRUEBAAAAAAAAAAAA', NULL, 'abierta', '2026-08-07 06:37:00', NULL, NULL, false),
(38, 'Incidencia de prueba', '123', NULL, 'abierta', '2026-08-07 06:39:20', NULL, NULL, false),
(39, 'Incidencia de prueba', '1', NULL, 'abierta', '2026-08-07 06:43:36', NULL, NULL, false),
(40, 'Incidencia de prueba', '2', NULL, 'abierta', '2026-08-07 06:43:57', NULL, NULL, false),
(41, 'Problema con autoline', 's', NULL, 'abierta', '2026-08-07 14:05:40', NULL, NULL, false),
(42, 'Ticket de prueba', 'prueba', NULL, 'abierta', '2026-08-07 14:07:04', NULL, NULL, false),
(43, 'Ticket de prueba 2', '123', NULL, 'abierta', '2026-08-07 14:09:14', NULL, NULL, false),
(44, 'Ticket de prueba', '123', NULL, 'abierta', '2026-08-07 14:10:20', NULL, NULL, false),
(45, 'INTERNET SALA MG', 'Buenos días,

En la mesa 2 de la exposición de MG no hay internet. Hay que volver a conectar el cable desde la mesa 1.

Tenemos a un comercial sin poder trabajar de momento', 50, 'cerrada', '2026-08-10 07:42:57', '2026-08-10 12:24:25', 6, false),
(46, 'TABLETS PARA TALLER', 'Me comenta Toni que necesitan unos telefonos para poder mandar fotos de los vehiculos', NULL, 'cerrada', '2026-08-10 10:28:26', '2026-08-21 08:57:15', 2, false),
(47, 'CORREO LLENO', 'Buenas, 
Me sigue saliendo como que tengo el correo lleno, cuando me mandan un correo les sale el siguiente mensaje.', 51, 'cerrada', '2026-08-13 08:10:10', '2026-08-13 14:54:44', 3, false),
(48, 'PORTATIL ACER', 'AL SACAR DESDE EL PROGRAMA DE DIAGNOSIS  VDS UN PDF SE CIERRA EL PROGRAMA.', 52, 'cerrada', '2026-08-13 13:28:09', '2026-08-13 16:24:01', 2, false),
(49, 'CORREO LLENO', 'Buenas Fran, sigo teniendo el mismo problema que no me llegan', 53, 'cerrada', '2026-08-13 13:48:34', '2026-08-14 16:24:47', 3, false),
(50, 'No me funciona Excel ni Word', 'Buenas,
No me funciona ni excel ni word, me dice que lo tengo sin licencia,
¿Podéis ayudarme? Adjunto foto
Gracias,
Jose', 54, 'cerrada', '2026-08-13 14:09:10', '2026-08-13 16:22:15', 4, false),
(51, 'Prueba', 'Prueba', 55, 'abierta', '2026-08-17 10:39:29', NULL, NULL, false),
(52, 'busqueda en carpetas no funciona', 'hola fran, me he dado cuenta que no me funciona la búsqueda de documentos,
antes al momento buscaba y aparecian las facturas y ahora nada', 56, 'abierta', '2026-08-17 13:03:28', NULL, 3, false),
(53, 'busqueda en carpetas no funciona', 'sigue sin ir', 57, 'cerrada', '2026-08-18 05:57:35', '2026-08-21 08:56:32', 3, false),
(54, 'Nombre correo Walcu', 'He cambiado mi nombre en la configuración de Walcu pero sigue apareciendo Javier Francisco al enviar un correo. Adjunto capturas. ¿Puedes revisarlo, por favor?', 58, 'cerrada', '2026-08-18 08:16:21', '2026-08-18 12:37:19', 4, false),
(55, 'FACTURA SHOPIFY NO RECONOCIDA', 'Se han cobrado un cargo desde shopify (plataforma online para montar tiendas) que no reconocemos, a la tarjeta de rebios.
', NULL, 'cerrada', '2026-08-18 10:42:39', '2026-08-18 12:46:45', 1, false),
(56, 'CARPETAS COMPARTIDAS WAGEN', 'Me comenta Amparo que han desaparecido archivos de la carpeta compartida que tiene con la Oficina Principal.', NULL, 'cerrada', '2026-08-19 06:23:17', '2026-08-19 08:23:31', 1, false),
(57, 'ORDENADOR DE SERGIO', 'no puede enviar correo electronicos . ni contestarlos', 59, 'cerrada', '2026-08-19 13:25:53', '2026-08-20 16:47:48', 2, false),
(58, 'busqueda en carpetas no funciona', 'hola fran, he descargado wizfile para poder buscar mas rapidamente, el problema es que para poder buscar en la carpeta del servidor hay que ponerle las credenciales para que pueda acceder a la busqueda', 60, 'abierta', '2026-08-20 09:09:42', NULL, 3, false),
(59, 'SIN INTERNET EXPO MG', 'Tenemos a un comercial sin internet en el ordenador, está sin trabajar desde las 9:00', 61, 'cerrada', '2026-08-21 08:00:34', '2026-08-25 08:50:24', 6, false),
(60, 'INCIDENCIA DF SERVER Y OUTLOOK', 'Tenemos a un comercial de MG sin DF SERVER ni OUTLOOK desde esta mañana.
No sabemos qué ocurre', 62, 'cerrada', '2026-08-24 16:55:48', '2026-08-25 12:33:16', 6, false),
(61, 'ORDENADOR DE ESTEBAN', 'REVISAR ORDENADOR DE ESTEBAN MIENTRAS ESTÁ DE VACACIONES
', NULL, 'cerrada', '2026-08-25 06:53:49', '2026-08-25 08:54:09', 1, false),
(62, 'FALLO SERVICE BOX', 'Falla la plataforma y no se pueden tramitar las garantias
', NULL, 'cerrada', '2026-08-27 12:29:39', '2026-08-27 14:29:50', 2, false),
(63, 'PORTATIL NUEVO CHANGAN', '', NULL, 'cerrada', '2026-08-27 12:31:03', '2026-08-27 14:31:33', 7, false),
(64, 'No me deja exportar Excel', 'Buenas! No me deja exportar en PDF desde excel los stocks, me podeis ayudar? Os mando pantallazo.', 63, 'cerrada', '2026-08-28 15:13:27', '2026-08-31 10:38:10', 4, false),
(65, 'FTP PARA CARPETA EN RED', 'Necesitan tener acceso desde la Tablet de Omoda (está totalmente capada) para pasarse archivos desde el ordenador y poder abrir expedientes con la marca
', NULL, 'cerrada', '2026-08-31 08:39:13', '2026-08-31 10:40:32', 2, false),
(66, 'la carpeta de pdf no funciona', 'no nos funciona a ninguno', 64, 'cerrada', '2026-08-31 10:10:44', '2026-09-02 08:27:58', 3, false),
(67, 'PORTATIL TALLER DENIA', 'Configuracion del portatil de taller de Denia.
', NULL, 'cerrada', '2026-08-31 11:22:59', '2026-08-31 13:23:06', 2, false),
(68, 'DUDAS DFSERVER', 'Buenas, necesito hablar con alguno de vosotros para poder solucionar unas incidencias en los expedientes que hago para los compraventas,
Por favor, llamarme al 670.059.836
Gracias', 65, 'cerrada', '2026-09-01 09:11:08', '2026-09-01 17:21:41', 4, false),
(69, 'CAMBIO DE PERSONAL', 'ESTHER YA NO ESTA. TENIA ESTE MAIL Esther <esther@borjamotor.com>
AHORA LA CHICA SE LLAMA REBECA. LO CAMBIAMOS?DEJAMOS EL MISMO? LO ENLAZAS?', 66, 'cerrada', '2026-09-01 09:32:04', '2026-09-02 16:10:11', 2, false),
(70, 'ordenador sobremesa', 'ordenador sobremesa del taller no funciona el del carrito, no enciende.', 67, 'abierta', '2026-09-01 09:45:51', NULL, 2, false),
(71, 'NO PUEDO ABRIR EL CORREO', 'Buenas tardes Fran, no me deja abrir el correo, supongo que será algo del servidor ya que mi correo va ligado creo', 68, 'cerrada', '2026-09-01 13:33:33', '2026-09-01 17:21:50', 3, false),
(72, 'PORTATIL LEPAS', 'Puesta en marcha y configuración', NULL, 'cerrada', '2026-09-02 06:29:25', '2026-09-02 08:29:43', 11, false),
(73, 'CAMBIAR ORDENADOR', 'Hola Fran! Cuando puedas hazme el cambio de un ordenador por otro por favor', 69, 'abierta', '2026-09-07 11:54:22', NULL, 7, false),
(74, 'outlook en telefono movil', 'Buenas tardes, quiero recibir los correos electronicos tambien en el telefono movil, guardando la configuracion de contactos y carpetas del pc.

Gracias', 70, 'abierta', '2026-09-08 15:01:40', NULL, 11, false);

insert into public.tarea_registros (id, tarea_id, usuario_id, comentario, horas, fecha_creacion) values

(9, 9, 1, 'modificar datos de usuario y aplicar correcciones', 0.25, '2026-08-05 10:39:49'),
(10, 13, 1, 'Contactar con lobocom y revisar webmail', 0.25, '2026-08-05 14:16:15'),
(11, 18, 1, 'Revision del correo.', 0.25, '2026-08-06 10:11:59'),
(15, 17, 1, 'Configuración de correo en el teléfono de Felipe', 0.25, '2026-08-06 11:31:25'),
(16, 21, 1, 'Revision plataforma Opel y actualizacion de datos y permisos', 0.50, '2026-08-06 11:32:15'),
(17, 19, 1, 'Revision del ordenador. El problema ocurre dentro de ServiceBox. Le he comentado a jefe de taller que pruebe a iniciar sesion con el usuario que si funciona en el resto de ordenadores, para ver si el problema viene de los terminales, o de los usuarios', 0.10, '2026-08-06 11:41:48'),
(21, 21, 1, 'Generar usuario DD para acceso al resto de plataformas', 0.25, '2026-08-06 14:39:40'),
(22, 35, 1, 'Contactar con IT y solucionar el problema', 0.25, '2026-08-06 16:13:14'),
(23, 19, 1, 'Revisión completa de los equipos. Problema anómalo con la página de Stellantis. Se comprueba el servidor DMS (172.16.5.3), no hay nada extraño, tiene red, y el servicio está activo. Se reinicia de todas maneras por si se hubiese quedado pillado. Sigue sin funcionar la plataforma. Ahora tampoco en el Ordenador que si funcionaba. Se comprueban los permisos del navegador y se borran los archivos en caché. Se aplica la misma configuración en el resto de equipos pero sigue sin funcionar. Probamos con otro navegador, pero sigue igual. Todos usan el mismo usuario, pero solo funciona de manera intermitente en uno de los eqiupos', 1.50, '2026-08-07 11:13:51'),
(24, 19, 1, 'Mandar ticket de soporte a Stellantis', 0.25, '2026-08-07 11:41:19'),
(25, 19, 1, 'Se compreba que tras el fin de semana, la pagina ha funcionado', 0.10, '2026-08-10 10:20:23'),
(26, 21, 1, 'Se comprueba que funciona', 0.10, '2026-08-10 10:21:26'),
(27, 33, 1, 'Conectar y configurar la impresora por red + configuracion en los portátiles de Changan', 0.50, '2026-08-10 10:22:03'),
(28, 45, 1, 'Los comerciales de MG deciden cambiar dos puestos de trabajo sin avisar al departamento de informática. No es que no tuviesen internet. Se cambia al comercial de nuevo a otro puesto de trabajo con conexión a red para que pueda trabajar.', 0.75, '2026-08-10 10:24:16'),
(29, 46, 1, 'Estudio con él la viabilidad de comprar terminales y le ofrezco la alternativa de comprar tablets blindadas. Estos dispositivos van a funcionar mejor, pues son equipos que vienen preparados para entornos industriales, con mayor batería, y mejor experiencia de usuario. Además se instalarán unos soportes en la pared para que los puedan cargar y dejar ahí cuando se vayan de las instalaciones', 0.50, '2026-08-10 10:30:47'),
(30, 46, 1, 'Búsqueda de los dispositivos con el proveedor + realizar pedido', 0.50, '2026-08-10 10:31:48'),
(31, 7, 1, 'Revision del ordenador de Sergio', 0.25, '2026-08-12 07:37:08'),
(32, 7, 1, 'Revisión de datos para traspasar al nuevo ordenador', 0.25, '2026-08-12 07:37:30'),
(34, 47, 1, 'Revision del correo.', 0.25, '2026-08-13 12:54:40'),
(35, 7, 1, 'Cambiamos disco duro al ordenador nuevo. Revisión para ver que funcione correctamente', 0.50, '2026-08-13 14:21:54'),
(36, 50, 1, 'Revision licencia', 0.10, '2026-08-13 14:22:12'),
(38, 48, 1, 'La aplicacion aparentemente funcionaba bien, pero fallaba a la hora de generar el informe en PDF. Se revisa el ordenador, pero funciona ok. Parece ser que la aplicacion funcionaba de manera anomala. Ni siquiera se bloqueaba el usuario cuando fallaba, cuando de normal si que lo bloquea. Se desinstala y ponemos la última versión. Se queda la aplicacion funcionando', 0.75, '2026-08-13 14:23:55'),
(39, 8, 1, 'Revisar ordenador', 0.50, '2026-08-13 14:24:29'),
(40, 49, 1, 'Revision del correo.', 0.25, '2026-08-13 14:45:14'),
(41, 49, 1, 'Vuelve a indicarme que no le funciona. Lo reviso con él y comprobamos que si funciona', 0.25, '2026-08-14 14:24:43'),
(42, 8, 1, 'Me vuelve a comentar que le falla el ordenador. Se revisan memorias RAM, compruebo que es lo que falla. Se cambian por unas nuevas y se actualiza tanto BIOS como chipset. Realizo test benchmark y no se observa inestabilidad tras el cambio y las actualizaciones', 1.00, '2026-08-14 14:26:04'),
(43, 54, 1, 'Revisar correo', 0.10, '2026-08-18 10:37:18'),
(44, 53, 1, 'Reviso el servidor porque parece que el problema es por la red. La búsqueda de archivos locales si que funciona bien. Se actualiza el server. Reviso el Ordenador de Felipe para ver si ha habido problemas con algun componente pero todo parece estar bien. Se reconstruye el indice para que el sistema operativo indexe de nuevo todos los archivos y relalice mejor las búsquedas', 0.75, '2026-08-18 10:39:32'),
(45, 55, 1, 'Investigo a que empresa puede estar vinculada la cuenta, pero solo con el número que viene en la factura y el soporte, no podemos conseguirlo', 0.50, '2026-08-18 10:43:25'),
(46, 55, 1, 'Le preguntamos a Antonio Nerja pero al parecer no sabe nada. Lo comento con Planelles y Felipe y parece ser que Harley utilizaba este servicio para vender. Felipe tiene el acceso por lo que bajo e inicio sesion desde su ordenador. La cuenta está vinculada al correo mktborjamotor@gmail.com, correo que se usa en marketing Borjamotor. Investigo desde la plataforma y comprobamos que esa es la cuenta vinculada al pago. Descargo factura y doy de baja el servicio para que no se lo vuelvan a cobrar el año que viene', 1.00, '2026-08-18 10:46:43'),
(47, 56, 1, 'Recuperar archivos', 3.00, '2026-08-19 06:23:28'),
(48, 57, 1, 'activar correo', 0.10, '2026-08-20 14:47:46'),
(49, 53, 1, 'Tras investigar, me doy cuenta que el servicio de indizacion no viene instalado por defecto en windows server. Se instala y se optimiza el ordenador de Felipe', 0.50, '2026-08-20 15:01:19'),
(50, 46, 1, 'Configuracion de los 3 dispositivos, configuracion de los ordenadores que necesitan el acceso, explicacion de como funciona el proceso', 2.00, '2026-08-21 06:57:13'),
(51, 59, 1, 'Reconexion a internet', 0.25, '2026-08-21 09:02:15'),
(52, 61, 1, 'REVISION, ACTUALIZACION Y MEJORA DEL ORDENADOR', 5.00, '2026-08-25 06:54:07'),
(53, 60, 1, 'El problema de Outlook era por la configuracion. Se cambia por la nueva y ya funciona. El resto de aplicaciones internas no funcionaba por conflicto entre adaptadores. Al tener el teléfono conectado al ordenador y compartirse internet, no le funcionaban las aplicaciones internas', 0.25, '2026-08-25 10:33:14'),
(54, 62, 1, 'Actualizar navegar y reconfigurar', 0.25, '2026-08-27 12:29:48'),
(55, 63, 1, 'Poner en marcha el portatil + configuracion', 2.00, '2026-08-27 12:31:31'),
(56, 64, 1, 'Revisar servicio de impresion', 0.10, '2026-08-31 08:38:08'),
(57, 65, 1, 'Como está totalmente bloqueada, ni siquiera dejar pasar archivos con el USB. Observo que tiene un explorador de archivos al que se puede conectar por FTP con el servidor. Creamos una carpeta específica para meter los archivos, instalo el servicio de FTP y lo configuro, y creo el enlace con la tablet para que puedan hacer la transferencia de archivos', 0.50, '2026-08-31 08:40:30'),
(58, 67, 1, 'Configuracion del portatil de taller de Denia para que pueda usar los programas de MG (VDS, SIPS, etc) y configuracion del VCI. Actualizar componentes de Windows para poder usar los programas. Falta actualizar la VDI porque no se la ha traido.', 1.50, '2026-08-31 11:23:03'),
(59, 71, 1, 'Revision del correo.', 0.10, '2026-09-01 15:21:49'),
(60, 72, 1, 'Puesta en marcha y configuración', 2.00, '2026-09-02 06:29:40'),
(61, 69, 1, 'Configuracion de correo', 0.25, '2026-09-02 14:10:09'),
(62, 70, 1, 'Revision del PC. No funciona cambiando el cable ni cambiando la pantalla. Falla la GPU', 0.25, '2026-09-02 14:10:39'),
(63, 70, 1, 'Cambiamos disco duro al ordenador nuevo. Revisión para ver que funcione correctamente. Al ponerlo bajo no sabemos por que ha dejado de funcionar tambien. Posible problema con la pantalla, pico de tensión, o cualquier otro defecto que provoque que al conectarlo bajo, se rompa el procesador grafico', 1.00, '2026-09-07 12:29:30');

insert into private.usuario_credenciales (usuario_id,password_hash,token_recuperacion,token_expiracion,token_verificacion) values

(1, '$2y$10$7sOhjxgqiUKUdbPIy5lFAeoqGXkjpFy8abl0LZJT8FuR1YZ6xr9lq', NULL, NULL, NULL),
(13, '$2y$10$S591Vs1iqRhPKyUIWICBYuCykJR4RaUSt5jn5cvMygTWcKEzoerea', NULL, NULL, NULL),
(14, '$2y$10$82Jg779ahMrtAs5xd7S23e/e6WfpqXIuYAAvvnz6oEAibpj276HgK', NULL, NULL, NULL),
(17, '$2y$10$nd8HVfWzREDaryivGiPt4eW7l3LeGLdGV9ZC7p/HPO3vsb2uuo9Ta', NULL, NULL, NULL),
(18, '$2y$10$k.lt.mj2taSsKbgX5rU/MuPLpfYT3//gCp9wcdk3Tr08S4wlV/C4u', NULL, NULL, NULL),
(19, '$2y$10$IyaQIQqtPO0bzxEomAX.2upEq5uD5/lPzNSWI6bNT7t.KfQqcVpWu', NULL, NULL, NULL),
(20, '$2y$10$znYAla96HZzkHERA8Q8zg.P2XiS60Wp.7Nbz8fK.ij/kEaH3yc.w2', NULL, NULL, NULL),
(21, '$2y$10$Hjegz4.SOgxU8X1jpokC6eC0EywAFBBS6J2Fq.OxZChM92A5I7LUO', NULL, NULL, NULL),
(22, '$2y$10$0dNuOWkBZWc9QwzxrwgFv.VFG5OY983NdwXLmW1DCML7YrCTEW10G', NULL, NULL, NULL),
(23, '$2y$10$KN/uOTV4G/A11JXLM3JSDO2OsV/eyWalFiiCsOTAss/pls3Pq84FO', NULL, NULL, NULL),
(24, '$2y$10$swnDzIANYYHOJ9WtFu1I8OsStiIC4azaiyId/DwmbRBj06tuJtgem', NULL, NULL, NULL),
(25, '$2y$10$rUTaH1e8krrG3PA6d3q0SOD4O1shfZacUoJzy0.MPXTQOaZNWAq2m', NULL, NULL, NULL),
(26, '$2y$10$y2yedcCxifGoXamCLN1uT.U3TkmzyqgTG3Gzcg9FwlT6xaJbxJZm6', NULL, NULL, NULL),
(27, '$2y$10$jNXA0jALetjtFoFaESRmx.9i9H9xOyAtLWWkGYNI/5YWw74DIsZ/6', NULL, NULL, NULL),
(29, '$2y$10$bunrslYTAaI5HGmO.trgDebtlyTHVuBQCUJX.YRP63atlf7YSTeai', NULL, NULL, NULL),
(30, '$2y$10$OmIul73zXZRCSiWtXx1syuo1ElQkj1.Mad6otHrqJ.hoGo55QN1P.', NULL, NULL, NULL),
(31, '$2y$10$/ESTa5AWPCn9tc4MBOnAd.I.ah8Nnvz9OMJgjR470iLi25.Mn.yAe', NULL, NULL, NULL),
(32, '$2y$10$NXVPKMgkiETlNqNNJgP.Fe73akH/R51dJSMp8Odk24iiTtKGYzxji', NULL, NULL, NULL),
(33, '$2y$10$swA0uOzOqafIEhvhPW16nu173tdNrp/P96syK08AsIHFuvPP8DY8K', NULL, NULL, NULL),
(34, '$2y$10$GQccQbJgf1u/xM16OL/JweDanuubh.iZzkaPLImwLPcI607R9fn1u', NULL, NULL, NULL),
(35, '$2y$10$xfQwj0fjV6x/5udyQW/hIex7gzkKO278XT0H5P4GnZaK3nc87/VuS', NULL, NULL, NULL),
(36, '$2y$10$KHPh7LcRj4e881zji9evi.0r0xa5eJ1fZPfBIGh.RT6PX7sB/AYqy', NULL, NULL, NULL),
(37, '$2y$10$dxfCjJPUnhMMsGIkMOlvQuKd2G9TqOVsGRc0L1l.XAAU5BYWnReBW', NULL, NULL, NULL),
(39, '$2y$10$Qm357nstWkU72rCth7nBKuHAEJqpo.vcMFaG6jMi/30QrnM7hBTxi', NULL, NULL, NULL),
(60, '$2y$10$5omMPo29.itszXEfQKyZS.WiXkVpR3lu8rmtqpSRg67BaMACUDjOG', NULL, NULL, NULL),
(61, '$2y$10$0RJHL.qPkSKAOjUJyarsHekVJL.ZNskmePEN27GOghFN/NF6nx7Cy', NULL, NULL, NULL),
(62, '$2y$10$AJThjT0rGoG4oI5exPE0v.LM2zcW0RXOoOwbtDHBinHaVoh72n5ca', NULL, NULL, NULL),
(64, '$2y$10$42IXz3eLoQofM43UoqehSeLldm7QsHQZZc.s/99zaoxqXLku0m0.2', NULL, NULL, NULL),
(65, '$2y$10$tCEsMiUaiebrRrANKVj4R.YdP2IT41SHO72aDrAMqCr9I.NN.UQfq', NULL, NULL, NULL),
(66, '$2y$10$EmIW5fwN6Rf7LlP2378NmOodf8VbDDKpPoXsPZT4dYaIQNtjETrrq', NULL, NULL, NULL),
(67, '$2y$10$7xOU4NkjVJaLZzYl4/.UnOcaK4gENqjfz4emj5QRm58zjCOwdPBsW', NULL, NULL, NULL),
(68, '$2y$10$wd8IS3c2zhgc/Ct8N.YN0uit4yoL6L4VZP/s.cpgK95Wdwat/JM4O', NULL, NULL, NULL),
(69, '$2y$10$fUuIUSQi5GZ0sLYjOi5Cdej7gchd12vm3qj.w2xQ4ZTP8Q3eNRnGO', NULL, NULL, NULL),
(70, '$2y$10$4ofVzcAMFl0Mdq8xpN7cQ.qHqioHGoD8MRwUnkRSfo2ql/M0iQbma', NULL, NULL, NULL),
(71, '$2y$10$5CY7c/2TfTcfw4GTHzt3KesZeHWjF4xaEqbY31CexvzsXSO5Naho6', NULL, NULL, NULL),
(72, '$2y$10$yy2Zy76CTmsT6sl8uez8kuoRlo3m3imoOjlKknDb1WIJWyjHnutN.', NULL, NULL, NULL),
(73, '$2y$10$dXtaE9CkbozypVDjS90uh.urvW3Q7WhXnyvA6q8veb4s6gl3PxIku', NULL, NULL, NULL),
(74, '$2y$10$ZunATak0gC0B6j8eHTS8uOyecSwCYj8sJSa5YROrmDIFB5dWL6y.C', NULL, NULL, NULL),
(75, '$2y$10$yrDtb201aKaEQf4uh7IjkuHEmbsfhqLlALkdeQ2kg2LGLXrCQ4Xre', NULL, NULL, NULL),
(76, '$2y$10$k7v2JsyPy3gj.PSzVBC9teecltyfX9R3DpHcXQ5fthAbieF6JhclK', NULL, NULL, NULL),
(77, '$2y$10$l01Ev7S3Rlz4nESYyVJMq./zE651COSqRAbmY9yaYsp3Geufcwk3K', NULL, NULL, NULL),
(78, '$2y$10$Uxai0tj9Em4DHX7zLe8.1OI/TN4Fek1TKozX8Pf9UcW2dUPDhMrnm', NULL, NULL, NULL);

select setval(pg_get_serial_sequence('public.centros_coste','id'), coalesce((select max(id) from public.centros_coste),0), true);

select setval(pg_get_serial_sequence('public.usuarios','id'), coalesce((select max(id) from public.usuarios),0), true);

select setval(pg_get_serial_sequence('public.equipos','id'), coalesce((select max(id) from public.equipos),0), true);

select setval(pg_get_serial_sequence('public.incidencias','id'), coalesce((select max(id) from public.incidencias),0), true);

select setval(pg_get_serial_sequence('public.mensajes','id'), coalesce((select max(id) from public.mensajes),0), true);

select setval(pg_get_serial_sequence('public.tareas','id'), coalesce((select max(id) from public.tareas),0), true);

select setval(pg_get_serial_sequence('public.tarea_registros','id'), coalesce((select max(id) from public.tarea_registros),0), true);

commit;
