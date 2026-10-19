import { apiFetch } from "@/lib/apiFetch";

export const uploadToCloudinary = async (file: File): Promise<string> => {
    try {
        const sigRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/uploads/signature?folder=support_tickets`);
        if (!sigRes.ok) throw new Error("Error al obtener la firma");

        const {
            signature, timestamp, cloudName, apiKey, folder,
            publicId, uploadPreset, allowedFormats
        } = await sigRes.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp.toString());
        formData.append("signature", signature);
        formData.append("folder", folder);

        formData.append("public_id", publicId);
        formData.append("upload_preset", uploadPreset);
        formData.append("allowed_formats", allowedFormats);


        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
        });

        if (!uploadRes.ok) throw new Error("Error subiendo imagen");

        const data = await uploadRes.json();
        return data.secure_url;
    } catch (error) {
        console.error("Fallo la subida a Cloudinary:", error);
        throw error;
    }
};