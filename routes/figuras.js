// routes/figuras.js
const router = require("express").Router();
const Figura = require("../models/figura.model");

// GET all figuras
router.route("/").get(async (req, res) => {
  try {
    const figuras = await Figura.find();
    res.json(figuras);
  } catch (err) {
    res.status(500).json("Error: " + err);
  }
});

// ADD new figura
router.route("/add").post(async (req, res) => {
  const { album, code, tipo } = req.body;

  if (!album || !code || !tipo) {
    return res.status(400).json("Faltan campos obligatorios");
  }

  const nuevaFigura = new Figura({ album, code, tipo });

  try {
    const saved = await nuevaFigura.save();
    // Devolvemos el objeto creado para que el front pueda leer el _id
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// GET figura by ID
router.route("/:id").get(async (req, res) => {
  try {
    const figura = await Figura.findById(req.params.id);
    if (!figura) return res.status(404).json("Figura no encontrada");
    res.json(figura);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// DELETE figura by ID
router.route("/del/:id").delete(async (req, res) => {
  try {
    await Figura.findByIdAndDelete(req.params.id);
    res.json("Figura eliminada!");
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

// UPDATE figura by ID
router.route("/update/:id").post(async (req, res) => {
  try {
    const figura = await Figura.findById(req.params.id);
    if (!figura) return res.status(404).json("Figura no encontrada");

    const { album, code, tipo } = req.body;
    if (album) figura.album = album;
    if (code)   figura.code  = code;
    if (tipo)   figura.tipo  = tipo;

    const updated = await figura.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
});

module.exports = router;
