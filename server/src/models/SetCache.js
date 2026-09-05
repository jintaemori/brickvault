import mongoose from 'mongoose'

const cachedPartSchema = new mongoose.Schema(
  {
    canonicalId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['part', 'minifig'], required: true },
    designId: String,
    partNum: String,
    basePartNum: String,
    isPrinted: { type: Boolean, default: false },
    colorId: Number,
    colorName: String,
    qtyPerSet: { type: Number, required: true, min: 1 },
    imageUrl: String,
  },
  { _id: false },
)

const setCacheSchema = new mongoose.Schema(
  {
    setNum: { type: String, required: true, unique: true, trim: true, index: true },
    setName: { type: String, required: true },
    imageUrl: String,
    numParts: Number,
    parts: { type: [cachedPartSchema], default: [] },
    lastFetched: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

export const SetCache = mongoose.model('SetCache', setCacheSchema)
