"use server";

import action from "@/lib/handlers/action";
import {SignInSchema, SignUpSchema} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import mongoose from "mongoose";
import { DTOUser, DTOAccount } from "@/database";
import bcrypt from "bcryptjs";
import {signIn} from "@/auth";
import {NotFoundError} from "@/lib/http.errors";

export async function signUpWithCredentials(params: AuthCredentials): Promise<ActionResponse> {

    const validationResult = await action({ params, schema: SignUpSchema});

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { name, username, email, password } = validationResult.params!;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingUser = await DTOUser.findOne({ email }).session(session);

        if (existingUser) {
            throw new Error("User already exists");
        }

        const existingUsername = await DTOUser.findOne({ username }).session(session);

        if (existingUsername) {
            throw new Error("Username already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [newUser] = await DTOUser.create(
            [
                { username, name, email }
            ],
            { session }
        );

        await DTOAccount.create(
            [
                {
                    userId: newUser._id,
                    name,
                    provider: 'credentials',
                    providerAccountId: email,
                    password: hashedPassword,
                }
            ],
            { session }
        );

        await session.commitTransaction();

        await signIn('credentials', { email, password, redirect: false });

        return { success: true, status: 200 }

    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }
}

export async function signInWithCredentials(params: Pick<AuthCredentials, 'email' | 'password'>): Promise<ActionResponse> {

    const validationResult = await action({ params, schema: SignInSchema});

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { email, password } = validationResult.params!;

    try {
        const existingUser = await DTOUser.findOne({ email });

        if (!existingUser) {
            throw new NotFoundError('User');
        }

        const existingAccount = await DTOAccount.findOne({ provider: 'credentials', providerAccountId: email });

        if (!existingAccount) {
            throw new NotFoundError('Account');
        }

        const passwordMatch = await bcrypt.compare(password, existingAccount.password);

        if (!passwordMatch) throw new Error("Password does not match");

        await signIn('credentials', { email, password, redirect: false });

        return { success: true, status: 200 }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}