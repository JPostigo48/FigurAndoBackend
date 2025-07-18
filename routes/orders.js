const router = require("express").Router();
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const auth     = require("../middleware/auth");  
const Album    = require("../models/album.model"); 
const Usuario  = require("../models/usuario.model");
const Figura = require("../models/figura.model");

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/", auth, async (req, res) => {
  const { albumId } = req.query;
  if (!albumId) return res.status(400).json({ error: "Falta albumId" });

  try {
    // 1) Carga el usuario con solo el array `orders`
    const user = await Usuario.findById(req.user._id)
      .select("orders")
      .populate("orders.items.figura", "code tipo");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // 2) Filtra solo los pedidos de este álbum
    const pedidos = user.orders
      .filter(o => o.album.toString() === albumId)
      // opcional: ordenar del más reciente al más antiguo
      .sort((a, b) => b.createdAt - a.createdAt)
      // formatea para solo exponer los campos que quieras
      .map(o => ({
        id:        o._id,
        customer:  o.customer,
        items:     o.items,
        total:     o.total,
        status:    o.status || "pending",
        createdAt: o.createdAt
      }));

    res.json(pedidos);
  } catch (err) {
    console.error("Error al leer pedidos:", err);
    res.status(500).json({ error: "Error al leer pedidos" });
  }
});


// POST /usuarios/create-order
router.post("/create-order", auth, async (req, res) => {
  try {
    const userId   = req.user._id
    const { albumId, customer, items, total } = req.body

    // 1) Valida campos
    if (!albumId || !customer || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Parámetros incompletos para crear pedido" })
    }

    // 2) Comprueba que el álbum exista
    const album = await Album.findById(albumId)
    if (!album) return res.status(404).json({ error: "Álbum no encontrado" })

    // 3) Comprueba que el usuario exista
    const usuario = await Usuario.findById(userId)
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" })

    // 4) Para cada item, valida que la figura exista y que el usuario tenga suficiente stock
    for (let it of items) {
      const fig = await Figura.findById(it.figuraId)
      if (!fig) {
        return res.status(400).json({ error: `Figura ${it.figuraId} no existe` })
      }
      // Busca el stock del usuario
      const entry = usuario.figurasUsuario.find(fu =>
        fu.figura.toString() === it.figuraId
      )
      if (!entry || entry.count < it.quantity) {
        return res.status(400).json({
          error: `No tienes suficientes unidades de la figura ${fig.code}`
        })
      }
    }

    // 5) Crea el subdocumento del pedido y lo empuja dentro de usuario.orders
    usuario.orders.push({
      album: albumId,
      customer,
      items: items.map(it => ({
        figura: it.figuraId,
        quantity: it.quantity
      })),
      total
    })

    // 6) Ajusta el stock de cada figura en el usuario
    items.forEach(it => {
      const entry = usuario.figurasUsuario.find(fu =>
        fu.figura.toString() === it.figuraId
      )
      entry.count -= it.quantity
    })

    // 7) Guarda
    await usuario.save()

    res.status(201).json({ message: "Pedido creado con éxito" })
  } catch (err) {
    console.error("Error en create-order:", err)
    res.status(500).json({ error: "Error interno al crear el pedido" })
  }
})

// POST /orders/:id/delivered
router.post("/:id/delivered", auth, async (req, res) => {
  const u = await Usuario.findById(req.user._id);
  const ord = u.orders.id(req.params.id);
  if (!ord) return res.status(404).json({ error: "Pedido no encontrado" });
  if (ord.status !== "pending")
    return res.status(400).json({ error: "Estado no válido" });
  ord.status = "delivered";
  await u.save();
  res.json({ message: "Pedido marcado como entregado" });
});

// POST /orders/:id/cancelled
router.post("/:id/cancelled", auth, async (req, res) => {
  const u = await Usuario.findById(req.user._id);
  const ord = u.orders.id(req.params.id);
  if (!ord) return res.status(404).json({ error: "Pedido no encontrado" });
  console.log(ord)
  // res.json({ message: "xd" });
  if (ord.status !== "pending")
    return res.status(400).json({ error: "Estado no válido" });
  ord.status = "cancelled";
  // opcional: reponer stock de figuras
  ord.items.forEach(it => {
    const fu = u.figurasUsuario.find(fu => fu.figura.toString() === it.figura.toString());
    if (fu) fu.count += it.quantity;
  });
  await u.save();
  res.json({ message: "Pedido cancelado" });
});
  

module.exports = router;