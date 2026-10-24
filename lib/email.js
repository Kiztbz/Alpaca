import {
    PasswordChangedTemplate,
    PasswordResetTemplate,
    EmailVerifyTemplate,
    EmailCodeTemplate,
} from "@/app/components/EmailTemplates";
import { Resend } from "resend";

let resend;

function getResend() {
    if (resend) return resend;

    const token = process.env.RESEND_TOKEN;
    if (!token) {
        throw new Error("RESEND_TOKEN is not defined.");
    }

    resend = new Resend(token);
    return resend;
}

export async function sendEmail({ emails, email, code, type }) {
    if (!process.env.BASE_URL) {
        throw new Error("BASE_URL is not defined.");
    }

    if (!emails?.length && !email) {
        throw new Error("Emails are required");
    }

    const templates = {
        X: {},
        "password-reset": {
            subject: "Reset your password",
            hasCode: true,
            template: <PasswordResetTemplate code={code} />,
        },
        "email-code": {
            subject: "Verify your email",
            hasCode: true,
            template: <EmailCodeTemplate code={code} />,
        },
        "email-verify": {
            subject: "Verify your email",
            hasCode: true,
            template: <EmailVerifyTemplate code={code} />,
        },
        "password-changed": {
            subject: "Password changed",
            template: <PasswordChangedTemplate />,
        },
    };

    const { subject, template, hasCode } = templates[type || "X"];

    if (!subject || !template) {
        throw new Error("Invalid email type");
    }

    if (hasCode && !code) {
        throw new Error("Email type requires a code");
    }

    if (process.env.NODE_ENV === "development") {
        email = "delivered@resend.dev";
    }

    try {
        const { data, error } = await getResend().emails.send({
            from: "Alpaca <support@updates.mart1d4.dev>",
            to: email || emails,
            subject,
            react: template,
        });

        if (error) throw new Error(error);
        return data.id;
    } catch (error) {
        console.error(error);
        return null;
    }
}
