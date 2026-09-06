import { DobotVectorizer } from './test'; // หรือ path ที่ถูกต้อง

export async function GET() {
  try {
    const config = {
      maxWidthMM: 320,
      maxHeightMM: 150,
      robotXMin: 180,
      robotXMax: 330,
      robotYMin: -145,
      robotYMax: 145,
      zHover: -27.53,
      zDraw: -47.53,
      scaleFactor: 0.7,
      mirrorY: true
    };

    const vectorizer = new DobotVectorizer(config);
    await vectorizer.generateText('สวัสดีไทย', './fonts/NotoSansThai-Regular.ttf', 100);
    vectorizer.generateVector(1.0, 3);
    vectorizer.saveCoordinates('./output.txt');

    return new Response('✅ Success', { status: 200 });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
}