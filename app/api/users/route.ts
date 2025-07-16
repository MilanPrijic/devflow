
import handleError from "@/lib/handlers/errors";
import dbConnect from "@/lib/mongoose";
import User from "@/database/user.model";
import {NextResponse} from "next/server";
import {UserSchema} from "@/lib/validaitons";
import {ValidationError} from "@/lib/http.errors";

// GET api/users
export async function GET() {
    try {
        await dbConnect();

        const users = await User.find();

        return NextResponse.json({ success: true, data: users }, { status: 200 });

    } catch (error) {
        return handleError(error, 'api') as APIErrorResponse;
    }
}

// POST api/users
export async function POST(request: Request) {
    try {
        await dbConnect();

        const body = await request.json();

        const validatedData = UserSchema.safeParse(body);

        if (!validatedData.success) {
            throw new ValidationError(validatedData.error.flatten().fieldErrors);
        }

        const { email, username } = validatedData.data;

        const existingUser = await  User.findOne({ email });
        if (existingUser) throw new Error("User already exists");


        const existingUsername = await User.findOne({ username });
        if (existingUsername) throw new Error("Username already exists");

        const newUser = await User.create(validatedData.data);

        return NextResponse.json({ success: true, data: newUser }, { status: 201 });

    } catch (error) {
        return handleError(error, 'api') as APIErrorResponse;
    }
}