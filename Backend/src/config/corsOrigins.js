export const getCorsOrigins = () => {
    const originStr = process.env.CORS_ORIGIN;
    
    if (process.env.NODE_ENV === "production") {
        if (!originStr || originStr.trim() === "") {
            throw new Error("CORS_ORIGIN environment variable is required in production");
        }
    }

    if (!originStr) {
        return [];
    }

    return originStr.split(",").map(origin => origin.trim()).filter(Boolean);
};
