
export const downloadCustomerTemplate = async () => {
    const XLSX = await import('xlsx');

    const columns = [
        "Member Number",
        "Name",
        "Village",
        "Mobile",
        "Whatsapp",
        "Cattle Type (cow, buffalo, or mixed)",
        "Number of Cattle",
        "Bank Name",
        "Account Number",
        "IFSC Code",
        "Amount Provided",
        "Date"
    ];

    const data = [
        {
            "Member Number": "CUST-0001 (Optional)",
            "Name": "John Doe",
            "Village": "Village Name",
            "Mobile": "9876543210",
            "Whatsapp": "9876543210",
            "Cattle Type (cow, buffalo, or mixed)": "cow",
            "Number of Cattle": 2,
            "Bank Name": "SBI",
            "Account Number": "1234567890",
            "IFSC Code": "SBIN0001234",
            "Amount Provided": 5000,
            "Date": "2024-03-20"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Adjust column widths
    const wscols = columns.map(c => ({ wch: c.length + 5 }));
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, "Customer_Import_Template.xlsx");
};
