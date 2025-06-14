const mongoose = require('mongoose')
const { Schema } = mongoose

const figuraSchema = new Schema({
  album: {
    type: String,
    required: true
  },
  code: {
    type: String,
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
}, { timestamps: true })

module.exports = mongoose.model('Figura', figuraSchema)
