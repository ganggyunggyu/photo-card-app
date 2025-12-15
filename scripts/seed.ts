import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://ganggyunggyu:12Qwaszx%21%40@cluster0.ypdjmyk.mongodb.net/photo-card-app';

interface ICoupon {
  no: number;
  couponNumber: string;
  isUsed: boolean;
  usedAt?: Date;
}

const couponSchema = new mongoose.Schema<ICoupon>({
  no: { type: Number, required: true },
  couponNumber: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date },
});

const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);

function loadCouponsFromCSV(): {
  no: number;
  couponNumber: string;
  isUsed: boolean;
}[] {
  const csvPath = path.join(
    __dirname,
    '../csv/쿠폰 1천개_251208.xlsx - Sheet1.csv'
  );
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  // 헤더: no,couponNumber,isUsed
  return lines.slice(1).map((line) => {
    const [no, couponNumber, isUsed] = line.split(',');
    return {
      no: parseInt(no, 10),
      couponNumber: couponNumber.trim(),
      isUsed: isUsed.trim() === 'true',
    };
  });
}

async function seed() {
  try {
    console.log('Loading coupons from CSV...');
    const couponDataList = loadCouponsFromCSV();
    console.log(`Found ${couponDataList.length} coupons in CSV`);

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Dropping existing coupons collection...');
    await Coupon.deleteMany({});

    console.log('Inserting coupon data...');
    const result = await Coupon.insertMany(
      couponDataList.map((item) => ({
        no: item.no,
        couponNumber: item.couponNumber,
        isUsed: item.isUsed,
      }))
    );

    console.log(`Successfully inserted ${result.length} coupons!`);

    // 확인용 출력
    console.log('\nSample data (first 5):');
    const sampleList = await Coupon.find().limit(5).lean();
    sampleList.forEach((coupon) => {
      console.log(
        `  - no: ${coupon.no}, code: ${coupon.couponNumber}, isUsed: ${coupon.isUsed}`
      );
    });

    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
