import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ContactFormContent {
	title: string;
	description: string;
	fields: {
		name: string;
		email: string;
		phone: string;
		message: string;
	};
	submitButton: string;
	successMessage: string;
	errorMessage: string;
}

interface ContactFormProps {
	content: ContactFormContent;
}

interface FormDataState {
	name: string;
	email: string;
	phone: string;
	message: string;
}

type FormStatus = "idle" | "loading" | "success" | "error";

const INITIAL_FORM_DATA: FormDataState = {
	name: "",
	email: "",
	phone: "",
	message: "",
};

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ContactForm({ content }: ContactFormProps) {
	const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM_DATA);
	const [status, setStatus] = useState<FormStatus>("idle");

	const isFormValid = useMemo(() => {
		return (
			formData.name.trim().length > 1 &&
			isValidEmail(formData.email.trim()) &&
			formData.message.trim().length > 5
		);
	}, [formData.email, formData.message, formData.name]);

	const handleFieldChange =
		(field: keyof FormDataState) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			setFormData((currentData) => ({
				...currentData,
				[field]: event.target.value,
			}));

			if (status !== "idle") {
				setStatus("idle");
			}
		};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isFormValid) {
			setStatus("error");
			return;
		}

		setStatus("loading");

		try {
			await new Promise((resolve) => {
				window.setTimeout(resolve, 1000);
			});

			setStatus("success");
			setFormData(INITIAL_FORM_DATA);
		} catch {
			setStatus("error");
		}
	};

	return (
		<section className="bg-muted/30 py-16 md:py-24">
			<div className="mx-auto max-w-3xl px-4">
				<div className="mb-10 space-y-4 text-center">
					<h2 className="font-heading text-3xl font-semibold md:text-4xl">
						{content.title}
					</h2>
					<p className="mx-auto max-w-2xl text-base text-muted-foreground">
						{content.description}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6 bg-background p-6 ring-1 ring-border md:p-8">
					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="contact-name" className="text-sm font-medium">
								{content.fields.name}
							</label>
							<Input
								id="contact-name"
								value={formData.name}
								onChange={handleFieldChange("name")}
								required
								aria-invalid={formData.name.length > 0 && formData.name.trim().length <= 1}
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="contact-email" className="text-sm font-medium">
								{content.fields.email}
							</label>
							<Input
								id="contact-email"
								type="email"
								value={formData.email}
								onChange={handleFieldChange("email")}
								required
								aria-invalid={
									formData.email.length > 0 && !isValidEmail(formData.email.trim())
								}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="contact-phone" className="text-sm font-medium">
							{content.fields.phone}
						</label>
						<Input
							id="contact-phone"
							type="tel"
							value={formData.phone}
							onChange={handleFieldChange("phone")}
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="contact-message" className="text-sm font-medium">
							{content.fields.message}
						</label>
						<Textarea
							id="contact-message"
							value={formData.message}
							onChange={handleFieldChange("message")}
							rows={6}
							required
							aria-invalid={
								formData.message.length > 0 && formData.message.trim().length <= 5
							}
						/>
					</div>

					<div className="flex flex-col gap-4">
						<Button type="submit" size="lg" disabled={status === "loading"}>
							{status === "loading" ? "Sending..." : content.submitButton}
						</Button>

						{status === "success" ? (
							<Alert>
								<AlertDescription>{content.successMessage}</AlertDescription>
							</Alert>
						) : null}

						{status === "error" ? (
							<Alert variant="destructive">
								<AlertDescription>{content.errorMessage}</AlertDescription>
							</Alert>
						) : null}
					</div>
				</form>
			</div>
		</section>
	);
}
