async function getAllSurveys() {
  try {
    const surveys = await Survey.find().sort({ createdAt: 1 });
    console.log(`Retrieved ${surveys.length} surveys`);
    return surveys;
  } catch (error) {
    console.error('Error retrieving surveys:', error);
    return [];
  }
}

// Function to retrieve a specific day's survey


module.exports = {
  getAllSurveys,
  getDaySurvey
};