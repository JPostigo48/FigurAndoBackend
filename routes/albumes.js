// routes/albumes.js
const router = require("express").Router();
const auth = require("../middleware/auth"); 
const Album = require("../models/album.model");
const Usuario  = require("../models/usuario.model");
const Figura = require("../models/figura.model");

// GET all albumes
router.route("/").get(async (req, res) => {
  try {
    const albumes = await Album.find();
    res.json(albumes);
  } catch (err) {
    res.status(500).json("Error: " + err);
  }
});

// ADD new album
router.route("/add").post(async (req, res) => {
  const { nombre, editorial, imagen, figuras } = req.body;

  // Validar campos obligatorios
  if (!nombre || !editorial || !imagen) {
    return res
      .status(400)
      .json({ error: "Faltan campos obligatorios: nombre, editorial o imagen" });
  }

  const newAlbum = new Album({ nombre, editorial, imagen, figuras });

  try {
    await newAlbum.save();
    res.json({ message: "Álbum creado!", album: newAlbum });
  } catch (err) {
    console.error("Error al crear álbum:", err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/nombre", async (req, res) => {
  try {
    const album = await Album.findById(req.params.id).select("nombre");
    if (!album) return res.status(404).json({ error: "Álbum no encontrado" });
    res.json({ nombre: album.nombre });
  } catch (err) {
    console.error("Error al obtener nombre de álbum:", err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

// GET album by ID
router.route("/:id").get(async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json("Album no encontrado");
    res.json(album);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// DELETE album by ID
router.route("/del/:id").delete(async (req, res) => {
  try {
    await Album.findByIdAndDelete(req.params.id);
    res.json("Album eliminado!");
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// GET figuras de un álbum (populando referencias)
router.get("/:id/figuras", auth, async (req, res) => {
  try {
    console.log("hola")
    const album = await Album.findById(req.params.id).populate("figuras");
    if (!album) return res.status(404).json({ error: "Álbum no encontrado" });
    res.json(album.figuras);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error de servidor" });
  }
});


router.get("/:id/tipos", async (req, res) => {
  const album = await Album.findById(req.params.id).select("tipos");
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });
  res.json(album.tipos);
});

// POST: añadir un nuevo tipo
router.post("/:id/tipos/add", async (req, res) => {
  const { key, label } = req.body;
  if (!key || !label) {
    return res.status(400).json({ error: "Falta key o label" });
  }
  const album = await Album.findById(req.params.id);
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

  if (album.tipos.some(t => t.key === key)) {
    return res.status(400).json({ error: "El tipo ya existe" });
  }
  album.tipos.push({ key, label });
  await album.save();
  res.json(album.tipos);
});

// PUT: actualizar label de un tipo existente
router.put("/:id/tipos/:key", auth, async (req, res) => {
  const albumId    = req.params.id;
  const oldKey     = req.params.key;
  const { newKey, label } = req.body;

  // 1) Buscar álbum
  const album = await Album.findById(albumId);
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

  // 2) Localizar índice del tipo
  const idx = album.tipos.findIndex(t => t.key === oldKey);
  if (idx === -1) return res.status(404).json({ error: "Tipo no existe" });

  // 3) Si cambian la key, asegurarnos de que no exista ya
  if (newKey && newKey !== oldKey) {
    if (album.tipos.some(t => t.key === newKey)) {
      return res.status(400).json({ error: `Ya existe un tipo con key '${newKey}'` });
    }
    album.tipos[idx].key = newKey;
  }

  // 4) Actualizar label
  if (label) {
    album.tipos[idx].label = label;
  }

  // 5) Guardar cambios en el álbum
  await album.save();

  // 6) Si la key cambió, propagar a figuras y usuarios
  if (newKey && newKey !== oldKey) {
    // 6a) Actualizar todas las Figuras de este álbum que tenían oldKey
    await Figura.updateMany(
      { album: album.nombre, tipo: oldKey },
      { $set: { tipo: newKey } }
    );

    // 6b) Actualizar en cada usuario su array figurasUsuario
    await Usuario.updateMany(
      { "figurasUsuario.tipo": oldKey, albumesUsuario: albumId },
      {
        $set: { "figurasUsuario.$[elem].tipo": newKey }
      },
      {
        arrayFilters: [{ "elem.tipo": oldKey }]
      }
    );

    // 6c) Si guardas setsUsuario también por tipo, actualízalos:
    await Usuario.updateMany(
      { "setsUsuario.tipo": oldKey, "setsUsuario.albumId": albumId },
      {
        $set: { "setsUsuario.$[s].tipo": newKey }
      },
      {
        arrayFilters: [{ "s.tipo": oldKey }]
      }
    );
  }

  // 7) Devolver la lista actualizada de tipos
  res.json(album.tipos);
});

// DELETE: eliminar un tipo
router.delete("/:id/tipos/delete/:key", async (req, res) => {
  const { key } = req.params;
  const album = await Album.findById(req.params.id);
  if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

  album.tipos = album.tipos.filter(t => t.key !== key);
  await album.save();
  res.json(album.tipos);
});

module.exports = router;
