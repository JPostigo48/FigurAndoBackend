const router = require("express").Router();
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const auth     = require("../middleware/auth");  
const Album    = require("../models/album.model"); 
const Usuario  = require("../models/usuario.model");

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
    const rol = "admin";
    const newUsuario = new Usuario({nombre, contra, figuras, rol});
    newUsuario.save()
    .then(() => res.json('Usuario añadido'))
    .catch(err => res.status(400).json('Error'+err));
});

router.get("/:userId/figuras", async (req, res) => {
  const { userId } = req.params;
  const { albumId } = req.query;
  const usuario = await Usuario.findById(userId)
    .populate("figurasUsuario.figura");
  const data = usuario.figurasUsuario
    .filter(fu => fu.figura.album.toString() === albumId)
    .map(fu => ({ figura: fu.figura, count: fu.count }));
  res.json(data);
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
  
    const data = usuario.figurasUsuario
      .filter(fu => fu.figura.album === album.nombre)  // compara nombre
      .map(fu => ({ figura: fu.figura, count: fu.count }));
  
    res.json(data);
  });
  

// POST /usuarios/update-figura
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

module.exports = router;