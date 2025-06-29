// routes/albumes.js
const router = require("express").Router();
const Album = require("../models/album.model");
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

// UPDATE album by ID
router.route("/update/:id").post(async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json("Album no encontrado");

    const { nombre, editorial, figuras } = req.body;
    if (nombre) album.nombre = nombre;
    if (editorial) album.editorial = editorial;
    if (Array.isArray(figuras)) album.figuras = figuras;

    await album.save();
    res.json("Album actualizado!");
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// GET figuras de un álbum (populando referencias)
router.get("/:id/figuras", async (req, res) => {
  try {
    const album = await Album.findById(req.params.id).populate("figuras");
    if (!album) return res.status(404).json({ error: "Álbum no encontrado" });
    // devolvemos el array de figuras completas
    res.json(album.figuras);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error de servidor" });
  }
});

// POST para añadir una figura a un álbum
router.post("/:id/add-figure", async (req, res) => {
  const albumId = req.params.id;
  const { tipo, code } = req.body;

  const album = await Album.findById(req.params.id);
  if (!album) return res.status(404).json("Album no encontrado");

  if (!tipo || !code) {
    return res
      .status(400)
      .json({ error: "Campos obligatorios: tipo y code" });
  }

  try {
    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ error: "Álbum no encontrado" });

    // 1) Creamos la figura
    const nuevaFigura = new Figura({
      album: album.nombre,
      tipo,
      code
    });
    await nuevaFigura.save();

    // 2) Asociamos al álbum
    album.figuras.push(nuevaFigura._id);
    await album.save();

    // 3) Devolvemos la figura recién creada
    res.json({ figure: nuevaFigura });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error al añadir figura",
      error: err
    });
  }
});

module.exports = router;
