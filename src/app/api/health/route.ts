import { NextResponse } from "next/server";
import { capabilityStatus } from "@/shared/config/env";
export function GET() { return NextResponse.json({ status: "ok", capabilities: capabilityStatus }); }
