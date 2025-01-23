import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates and downloads a PDF for the given offer.
 * @param offer The offer data to include in the PDF.
 * @param offerElementId The ID of the HTML element containing the offer content.
 */
export const generateOfferPDF = async (
  offer: {
    title: string;
    summary: string;
    progress_plan: string;
    total_price: number;
  },
  offerElementId: string
) => {
  if (!offer) {
    throw new Error("No offer provided.");
  }

  const offerElement = document.getElementById(offerElementId);
  if (!offerElement) {
    throw new Error("Offer element not found!");
  }

  try {
    // Capture the content of the offer element
    const canvas = await html2canvas(offerElement);
    const imgData = canvas.toDataURL("image/png");

    // Create a new PDF document
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale the image to fit within the PDF page
    const imgWidth = canvas.width > canvas.height ? pageWidth : pageHeight;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add the image to the PDF
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    // Download the PDF with a meaningful filename
    const sanitizedTitle = offer.title.replace(/\s+/g, "_");
    pdf.save(`${sanitizedTitle}_Offer.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate the PDF.");
  }
};
