// routes/albumes.js
const router = require("express").Router();
const Album = require("../models/album.model");

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

module.exports = router;
