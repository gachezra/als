import User from '../models/User.js';
import Survey from '../models/Survey.js';
import Response from '../models/Response.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

const SURVEY_LIMIT = 3;
const VIDEO_LIMIT = 3;

export async function getDaySurvey(re) {
  try {
    // Find survey with title starting with the day number
    const survey = await Survey.findOne({
      title: new RegExp(`^Day ${dayNumber}:`)
    });
    
    if (survey) {
      console.log(`Retrieved survey for day ${dayNumber}: ${survey.title}`);
      return survey;
    } else {
      console.log(`No survey found for day ${dayNumber}`);
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving survey for day ${dayNumber}:`, error);
    return null;
  }
}

export const getAvailableSurveys = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Check if 24 hours have passed since the last reset
    if (user.shouldResetSurveyCount()) {
      user.surveyCount = 0;
      user.lastSurveyCountReset = new Date();
      await user.save();
    }

    // Check if the user has reached the survey limit
    if (user.surveyCount >= SURVEY_LIMIT) {
      return res.status(400).json({
        status: 'error',
        message: 'Survey limit reached for today',
        surveysLeft: 0,
        nextReset: user.lastSurveyCountReset
          ? new Date(user.lastSurveyCountReset.getTime() + 24 * 60 * 60 * 1000)
          : null
      });
    }

    // Fetch surveys that do not include the user ID
    const surveysLeft = SURVEY_LIMIT - user.surveyCount;
    const surveys = await Survey.find({ users: { $ne: userId } })
      .sort({ createdAt: 1 })
      .limit(surveysLeft);

    res.status(200).json({
      status: 'success',
      surveys,
      surveysLeft
    });
  } catch (error) {
    console.error('Error fetching available surveys:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch available surveys' });
  }
};

export async function getAllSurveys(req, res) {
  try {
    const surveys = await Survey.find().sort({ createdAt: 1 });
    console.log(`Retrieved ${surveys.length} surveys`);
    res.status(200).json(surveys);
  } catch (error) {
    console.error('Error retrieving surveys:', error);
    return [];
  }
}

export async function submitResponse(req, res) {
  try {
    const { participant } = req.params;
    const { surveyId, answers } = req.body;
    
    // Function to format date as YYYYMMDDHHMMSS
    function formatTransactionDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let user = await User.findById(participant).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.surveyCount >= SURVEY_LIMIT) {
        await session.abortTransaction();
        session.endSession();
        return res.status(405).json({ message: 'Survey limit reached for today' });
      }

      // Check if the survey exists
      const survey = await Survey.findById(surveyId).session(session);
      if (!survey) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Survey not found');
      }

      // Validate provided question IDs
      const surveyQuestionIds = survey.questions.map(q => q._id.toString());
      for (let ans of answers) {
        if (!surveyQuestionIds.includes(ans.questionId)) {
          await session.abortTransaction();
          session.endSession();
          throw new Error(`Invalid questionId provided: ${ans.questionId}`);
        }
      }

      // Create response document
      const response = new Response({
        surveyId,
        participant,
        answers
      });

      await response.save({ session });
      
      // Calculate reward amount based on user level
      const rewardAmount = user.level * 5;
      
      // Update user wallet
      const currentBalance = user.wallet || 0;
      user.wallet = Number(currentBalance) + Number(rewardAmount);
      
      // Create transaction record
      const transactionData = {
        user: participant,
        amount: rewardAmount,
        type: 'reward',
        status: 'success',
        resultCode: 0,
        resultDesc: 'Survey response reward',
        orderId: response._id.toString(),
        merchantRequestId: `SURVEY_${surveyId}`,
        checkoutRequestId: `RESP_${new Date().getTime()}`,
        mpesaReceiptNumber: `SR${Math.floor(100000 + Math.random() * 900000)}`, // Generate a random receipt number
        transactionDate: formatTransactionDate(new Date())
      };
      
      // Save transaction
      await Transaction.create([transactionData], { session });
      
      // Save updated user
      await user.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        status: 'success',
        message: 'Response submitted and reward added to wallet',
        data: {
          responseId: response._id,
          rewardAmount,
          newBalance: user.wallet
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error('Error submitting response:', err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to submit response',
      error: err.message 
    });
  }
}

export const incrementSurveyCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { surveyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID format' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let user = await User.findById(userId).session(session);

      if (!user) {
        user = new User({
          _id: userId,
          surveyCount: 1,
          surveyCountTotal: 1,
          videoCount: 0,
          videoCountTotal: 0,
          lastSurveyCountReset: new Date()
        });
      } else {
        // Check if 24 hours have passed since the last reset
        if (user.shouldResetSurveyCount()) {
          user.surveyCount = 0;
          user.lastSurveyCountReset = new Date();
        }

        // Check if the user has reached the survey limit
        if (user.surveyCount >= SURVEY_LIMIT) {
          await session.abortTransaction();
          return res.status(400).json({ 
            status: 'error', 
            message: 'Survey limit reached for today',
            nextReset: user.lastSurveyCountReset ? new Date(user.lastSurveyCountReset.getTime() + 24 * 60 * 60 * 1000) : null
          });
        }

        // Increment counts
        user.surveyCount += 1;
        user.surveyCountTotal += 1;
      }

      let survey = await Survey.findById(surveyId).session(session);
    
      if (!survey.users.includes(userId)) {
        survey.users.push(userId);
      } else {
        return res.status(400)
      }

      await user.save({ session });
      await survey.save({ session });
      await session.commitTransaction();
      
      res.status(200).json({ 
        status: 'success', 
        message: 'Survey Completed!',
        currentCount: user.surveyCount,
        totalCount: user.surveyCountTotal,
        limit: SURVEY_LIMIT
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error incrementing survey count:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record survey' });
  }
};

export const incrementVideoCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID format' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let user = await User.findById(userId).session(session);

      if (!user) {
        user = new User({
          _id: userId,
          surveyCount: 0,
          surveyCountTotal: 0,
          videoCount: 1,
          videoCountTotal: 1,
          lastVideoCountReset: new Date()
        });
      } else {
        // Check if 24 hours have passed since the last reset
        if (user.shouldResetVideoCount()) {
          user.videoCount = 0;
          user.lastVideoCountReset = new Date();
        }

        // Check if the user has reached the video limit
        if (user.videoCount >= VIDEO_LIMIT) {
          await session.abortTransaction();
          return res.status(400).json({ 
            status: 'error', 
            message: 'Video limit reached for today',
            nextReset: user.lastVideoCountReset ? new Date(user.lastVideoCountReset.getTime() + 24 * 60 * 60 * 1000) : null
          });
        }

        // Increment counts
        user.videoCount += 1;
        user.videoCountTotal += 1;
      }

      await user.save({ session });
      await session.commitTransaction();
      
      res.status(200).json({ 
        status: 'success', 
        message: 'Video count incremented',
        currentCount: user.videoCount,
        totalCount: user.videoCountTotal,
        limit: VIDEO_LIMIT
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error incrementing video count:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record video watch' });
  }
};

// Optional: Add endpoint to check current limits and when they reset
export const getUserActivityLimits = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Calculate when limits will reset
    const surveyResetTime = user.lastSurveyCountReset 
      ? new Date(user.lastSurveyCountReset.getTime() + 24 * 60 * 60 * 1000)
      : null;
      
    const videoResetTime = user.lastVideoCountReset
      ? new Date(user.lastVideoCountReset.getTime() + 24 * 60 * 60 * 1000)
      : null;

    res.status(200).json({
      status: 'success',
      data: {
        survey: {
          currentCount: user.surveyCount,
          totalCount: user.surveyCountTotal,
          limit: SURVEY_LIMIT,
          resetsAt: surveyResetTime
        },
        video: {
          currentCount: user.videoCount,
          totalCount: user.videoCountTotal,
          limit: VIDEO_LIMIT,
          resetsAt: videoResetTime
        }
      }
    });
  } catch (error) {
    console.error('Error getting user activity limits:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve user activity limits' });
  }
};