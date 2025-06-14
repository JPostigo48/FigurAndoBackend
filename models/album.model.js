const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    }]
},
{ timestamps: true });

const Album = mongoose.model("Album",albumSchema);

module.exports = Album;
