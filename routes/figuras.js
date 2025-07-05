// routes/figuras.js
const router  = require("express").Router();
const auth    = require("../middleware/auth");         // tu middleware de auth
const Figura  = require("../models/figura.model");
const Album   = require("../models/album.model");
const Usuario = require("../models/usuario.model");

// ——————————————————————————————————————————————
// GET all figuras (simple)
// GET /figuras
router.get("/", auth, async (req, res) => {
  try {
    const figuras = await Figura.find();
    res.json(figuras);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

// ——————————————————————————————————————————————
// ADD new figura, propagar a álbum y a usuarios
// POST /figuras/add
router.post("/add", auth, async (req, res) => {
  const { albumId, code, tipo } = req.body;
  if (!albumId || !code || !tipo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // 1) Verificar que el álbum exista y obtener sus tipos válidos
    const album = await Album.findById(albumId).select("nombre tipos figuras");
    if (!album) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    // 2) Validar que 'tipo' esté en album.tipos
    if (!album.tipos.some(t => t.key === tipo)) {
      return res.status(400).json({
        error: `Tipo '${tipo}' no válido para el álbum '${album.nombre}'`
      });
    }

    // 3) Crear y guardar la figura
    const nueva = new Figura({
      album: album.nombre,
      code,
      tipo
    });
    await nueva.save();

    // 4) Añadir al array de figuras del álbum
    album.figuras.push(nueva._id);
    await album.save();

    // 5) Para cada usuario que tenga ese álbum, añadir la figura con count=0
    await Usuario.updateMany(
      { albumesUsuario: albumId },
      { $push: { figurasUsuario: { figura: nueva._id, count: 0 } } }
    );

    res.status(201).json({ figure: nueva });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando figura" });
  }
});

// ——————————————————————————————————————————————
// DELETE figura by ID, propagar a álbum y a usuarios
// DELETE /figuras/:id
router.delete("/:id", auth, async (req, res) => {
  const figId = req.params.id;
  try {
    // 1) Eliminar la figura de la colección
    const figura = await Figura.findByIdAndDelete(figId);
    if (!figura) {
      return res.status(404).json({ error: "Figura no encontrada" });
    }

    // 2) Quitarla del array de figuras de todos los álbumes (normalmente sólo uno)
    await Album.updateMany(
      { figuras: figId },
      { $pull: { figuras: figId } }
    );

    // 3) Quitarla de las colecciones de todos los usuarios
    await Usuario.updateMany(
      {},
      { $pull: { figurasUsuario: { figura: figId } } }
    );

    res.json({ message: "Figura eliminada de colección, álbum y usuarios" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error eliminando figura" });
  }
});

// ——————————————————————————————————————————————
// UPDATE figura by ID (sin propagación extra — los usuarios seguirán apuntando al mismo _id)
// POST /figuras/update/:id
router.post("/update/:id", auth, async (req, res) => {
  try {
    const figura = await Figura.findById(req.params.id);
    if (!figura) {
      return res.status(404).json({ error: "Figura no encontrada" });
    }

    const { albumId, code, tipo } = req.body;
    // si cambias album, tendrías que mover también en Album.figuras y en usuarios,
    // pero normalmente no se reubica de álbum. Aquí solo code/tipo:
    if (code) figura.code = code;
    if (tipo) figura.tipo = tipo;

    const updated = await figura.save();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
