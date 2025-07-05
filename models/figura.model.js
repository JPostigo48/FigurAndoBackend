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
    required: true,
    trim: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Figura', figuraSchema)
