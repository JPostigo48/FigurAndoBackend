const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { Schema } = mongoose

const figurasUsuarioSchema = new Schema({
  figura: {
    type: Schema.Types.ObjectId,
    ref: 'Figura',
    required: true
  },
  tipo:   {
    type: String,
    // required: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false })

const setUsuarioSchema = new Schema({
  album: {
    type: Schema.Types.ObjectId,
    ref: 'Album',
    required: true
  },
  tipo: {
    type: String,
    enum: [
      'normal',
      'dorado_normal',
      'dorado_escarchado',
      'lenticular',
      'troquelada',
      'premio'
    ],
    required: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const usuarioSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  contra: {
    type: String,
    required: true,
    minlength: 6
  },
  albumesUsuario: [{
    type: Schema.Types.ObjectId,         
    ref: 'Album',                              
  }],
  figurasUsuario: [ figurasUsuarioSchema ],
  setsUsuario:     [ setUsuarioSchema ], 
  rol: {
    type: String,
    enum: ['usuario','admin'],
    default: 'usuario'
  }
}, { timestamps: true })

// Middleware para hashear la contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('contra')) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.contra = await bcrypt.hash(this.contra, salt)
    next()
  } catch (err) {
    next(err)
  }
})

// Método de instancia para comparar contraseña en el login
usuarioSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.contra)
}

module.exports = mongoose.model('Usuario', usuarioSchema)
