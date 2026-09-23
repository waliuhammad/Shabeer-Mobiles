import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const text = readFileSync("./.env.local", "utf8");
for (const l of text.split("\n")) { const t=l.trim(); if(!t||t.startsWith("#"))continue;
  const i=t.indexOf("="); if(i===-1)continue; let v=t.slice(i+1).trim();
  if((v.startsWith('"')&&v.endsWith('"')))v=v.slice(1,-1);
  process.env[t.slice(0,i).trim()] ??= v; }
initializeApp({credential: cert({projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,
 clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
 privateKey:process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\n/g,"\n")})});
await getFirestore().collection("products").doc("p-009").update({ price: 4999 });
console.log("  set p-009 price to 4999 in Firestore");
process.exit(0);
