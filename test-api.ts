
async function testSendOtp() {
  const email = "nguyenvandat170296@gmail.com";
  console.log(`--- Testing OTP Send for ${email} ---`);
  
  try {
    const response = await fetch("http://localhost:3000/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
    
    if (response.ok) {
        console.log("\n✅ SUCCESS: OTP request triggered successfully.");
        if (data.dev) {
            console.log(`💡 DEV NOTE: Check the console output above for the OTP.`);
        } else {
            console.log(`📧 SYSTEM NOTE: An actual email was sent via SMTP.`);
        }
    } else {
        console.log("\n❌ FAILED: API returned an error.");
    }
  } catch (err: any) {
    console.error("\n💥 CONNECTION ERROR: Could not reach the server. Is it running?", err.message);
  }
}

testSendOtp();
