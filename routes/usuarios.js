const router = require("express").Router();
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const auth     = require("../middleware/auth");  
const Album    = require("../models/album.model"); 
const Usuario  = require("../models/usuario.model");
const Figura = require("../models/figura.model");

const JWT_SECRET = process.env.JWT_SECRET;

router.route('/').get((req,res)=>{
    Usuario.find()
    .then(usuarios => res.json(usuarios))
    .catch(err => res.status(400).json('Error'+err));
});

router.route('/add').post((req,res)=>{
    const nombre = req.body.nombre;
    const contra = req.body.contra;
    const figuras = [];
    const rol = req.body.rol;
    const newUsuario = new Usuario({nombre, contra, figuras, rol});
    newUsuario.save()
    .then(() => res.json('Usuario añadido'))
    .catch(err => res.status(400).json('Error'+err));
});

router.get("/:userId/figuras", async (req, res) => {
  const { userId } = req.params;
  const { albumId } = req.query;

  const album = await Album.findById(albumId);
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

  const usuario = await Usuario.findById(userId)
    .populate("figurasUsuario.figura");

  const data = usuario.figurasUsuario
    .filter(fu => fu.figura.album === album.nombre)  // compara nombre
    .map(fu => ({ figura: fu.figura, count: fu.count }));

  res.json(data);
});

router.get("/:id/nombre", async (req, res) => {
  try {
    const user = await Usuario.findById(req.params.id).select("nombre");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ nombre: user.nombre });
  } catch (err) {
    console.error("Error al obtener nombre de usuario:", err);
    res.status(500).json({ error: "Error de servidor" });
  }
});


router.route('/login').post(async (req, res) => {
    try {
      const { nombre, contra } = req.body;
  
      const user = await Usuario.findOne({ nombre });
      if (!user) {
        return res.status(400).json({ error: 'Usuario no encontrado' });
      }
  
      const match = await bcrypt.compare(contra, user.contra);
      if (!match) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
  
      const payload = {
        id:    user._id,
        nombre: user.nombre,
        rol:   user.rol
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  
      res.json({
        token,
        usuario: {
          id:     user._id,
          nombre: user.nombre,
          rol:    user.rol
        }
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error de servidor' });
    }
  });

router.post("/albumes", /* auth, */ async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Falta userId en el body" });
    }

    // Buscar usuario y poblar albumesUsuario
    const usuario = await Usuario.findById(userId)
      .populate({
        path: "albumesUsuario",
        select: "id nombre editorial imagen"  // campos a devolver
      });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Devolver el array de álbumes
    res.json(usuario.albumesUsuario);
  } catch (err) {
    console.error("Error en POST /usuario/albumes:", err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

router.post("/albumesIds", /* auth, */ async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Falta userId en el body" });
    }

    // Busca al usuario y trae solo el campo albumesUsuario
    const usuario = await Usuario.findById(userId, "albumesUsuario");
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Devolver el array de IDs
    res.json(usuario.albumesUsuario);
  } catch (err) {
    console.error("Error en POST /usuario/albumesIds:", err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

// GET /usuarios/figuras?albumId=...
router.get("/figuras", auth, async (req, res) => {
  const { albumId } = req.query;
  // 1) Primero busca el álbum para obtener su nombre
  const album = await Album.findById(albumId);
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

  const usuario = await Usuario.findById(req.user._id)
    .populate("figurasUsuario.figura");

  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  // const missing = [];
  // let i=0
  // for (const fu of usuario.figurasUsuario) {
  //   i=i+1
  //   // Si ya vino null en populate, la guardamos
  //   const fig = fu.figura.album;
  //   console.log(fig+" "+i)
  //   // Verificamos existencia en la colección figuras
  //   const exists = Figura.exists({ _id: fig });
  //   if (!exists) missing.push(id);
  // }

  // console.log(missing)
  

  const data = usuario.figurasUsuario
    .filter(fu => fu.figura !== null)
    .filter(fu => fu.figura.album === album.nombre) 
    .map(fu => ({ figura: fu.figura, count: fu.count }));

  res.json(data);
});


// POST /usuarios/update-figura
// routes/usuarios.js
router.post("/update-figura", auth, async (req, res) => {
  const { figuraId, delta } = req.body;
  const user = await Usuario.findById(req.user._id);
  const entry = user.figurasUsuario.find(fu =>
    fu.figura.toString() === figuraId
  );
  if (!entry) return res.status(404).json({ error: "Figurita no encontrada" });
  entry.count = Math.max(0, entry.count + delta);
  await user.save();
  res.json({ figuraId, count: entry.count });
});

router.post('/add-album', auth, async (req, res) => {
  try {
    const userId  = req.user._id;
    const { albumId } = req.body;

    // 1. Busca el álbum y sus figuras
    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ error: 'Álbum no encontrado' });

    // 2. Construye la lista de subdocs para figurasUsuario
    //    (solo aquellas que el usuario aún no tenga)
    const newFigureDocs = album.figuras
      .filter(figId => true) // aquí podrías filtrar las ya existentes
      .map(figId => ({ figura: figId, count: 0 }));

    // 3. Actualiza el usuario: addToSet album y push each figura
    const updated = await Usuario.findByIdAndUpdate(
      userId,
      {
        $addToSet: { albumesUsuario: albumId },
        $push:    { figurasUsuario: { $each: newFigureDocs } }
      },
      { new: true }
    ).populate('albumesUsuario figurasUsuario.figura');

    res.json({ message: 'Álbum añadido', usuario: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/create-set', auth, async (req, res) => {
  const userId  = req.user._id;
  const { albumId, tipo } = req.body;
  if (!albumId || !tipo) {
    return res.status(400).json({ error: 'Falta albumId o tipo' });
  }

  // 1) Verifico que el álbum exista
  const album = await Album.findById(albumId).populate('figuras');
  if (!album) {
    return res.status(404).json({ error: 'Álbum no encontrado' });
  }

  // 2) Recojo todas las figuras de ese tipo en el álbum
  const figsOfType = album.figuras.filter(f => f.tipo === tipo);
  if (figsOfType.length === 0) {
    return res.status(400).json({ error: 'No hay figuras de ese tipo en el álbum' });
  }

  // 3) Cargo al usuario con sus figurasUsuario
  const usuario = await Usuario.findById(userId);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // 4) Compruebo que tiene al menos 1 de cada figura
  for (const fig of figsOfType) {
    const fu = usuario.figurasUsuario.find(x => x.figura.equals(fig._id));
    if (!fu || fu.count < 1) {
      return res.status(400).json({
        error: `No tienes suficiente de la figura ${fig.code}`
      });
    }
  }

  // 5) Hago el decremento de cada figura
  for (const fig of figsOfType) {
    const idx = usuario.figurasUsuario.findIndex(x => x.figura.equals(fig._id));
    usuario.figurasUsuario[idx].count -= 1;
  }

  // 6) Incremento (o inicializo) el set de este tipo
  const existingSet = usuario.setsUsuario.find(s => s.tipo === tipo);
  if (existingSet) {
    existingSet.count += 1;
  } else {
    usuario.setsUsuario.push({
      album: albumId,
      tipo,
      count: 1
    });
  }

  // 7) Guardo y devuelvo al usuario actualizado (sin la contraseña)
  await usuario.save();
  const safeUser = {
    id:       usuario._id,
    nombre:   usuario.nombre,
    rol:      usuario.rol,
    albumesUsuario: usuario.albumesUsuario,
    // opcional: devolver también sus nuevos sets y figurasUsuario
    setsUsuario:    usuario.setsUsuario,
    figurasUsuario: usuario.figurasUsuario
  };

  res.json({ message: 'Set creado!', usuario: safeUser });
});

router.get("/sets", auth, async (req, res) => {
  const { albumId } = req.query;
  const user = await Usuario.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  const arr = (user.setsUsuario || [])
    .filter(s => s.album.toString() === albumId)
    .map(({ tipo, count }) => ({ tipo, count }));

  return res.json(arr);
});
  

module.exports = router;