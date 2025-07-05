const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tipoAlbumSchema = new Schema({
    key: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    }
  }, { _id: false });

const albumSchema = new Schema({
    nombre: {
      type: String,
      required: true,
    },
    editorial:{
      type: String,
      required: true,
    },
    imagen:{
      type: String,
      required: true,
    },
    figuras:[{
      type: Schema.Types.ObjectId,
      ref: 'Figura',
      required: true
    }],
    tipos: {
      type: [ tipoAlbumSchema ],
      default: [
        { key: 'normal', label: 'Normal' },
      ]
    }
  }, { timestamps: true });

const Album = mongoose.model("Album",albumSchema);

module.exports = Album;
