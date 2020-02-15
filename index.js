const express = require('express');
const bodyParser = require('body-parser');

const ad = require('./helper-functions/airtable-database');

// Actions-on-Google
const {
    dialogflow,
    actionssdk,
    Image,
    Table,
    Carousel,
    Suggestions,
    BasicCard
} = require('actions-on-google');

const app = dialogflow({
    debug: true
});

// Error handling
app.catch((conv, error) => {
    console.error('Error at conv catch --> ', error);
    //conv.close('Oh Dear, I encountered a glitch. Please try again after some time.');
    conv.ask('I couldnt connect the word you say in the right context. Please, go back and try again.');
    conv.ask(new BasicCard({
        title: 'Conv catch error',
        subtitle: 'Please, go back and try again.',
        text: 'I couldnt connect the word you say to the right context.',
        image: new Image({
            url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2Fwrong_answer_1.gif?alt=media&token=518d78ae-2d91-4653-aba4-1a5023739a99',
            alt: 'error'
        }),
        display: 'WHITE'
    }));
    conv.ask(new Suggestions('Names', 'Menu'));
});

// Fallback
app.fallback((conv) => {
    conv.ask(`I couldn't understand. Please try again after some time.`);
});

// Initialize
app.intent('Default Welcome Intent', async (conv) => {

    // Get all the user names
    let names = await ad.getUserNames();

    // Set Default Fallback Count
    conv.data.fallbackCount = 0;

    // Set the context
    conv.contexts.set('await-student-name', 1);

    conv.ask('Hi, welcome to learn new things!  \nPlease, choose your username.');
    conv.ask(new BasicCard({
        title: 'OVObot teacher',
        subtitle: 'I help you learn new things',
        text: 'Say the name or press button.',
        image: new Image({
            url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2FOVOselfie_400x400.png?alt=media&token=94ffc74a-ce93-462e-9728-bbd06261e2ec',
            alt: 'OVObot selfie'
        }),
        display: 'WHITE'
    }));
    conv.ask(new Suggestions(names.slice(0, 8)));

});

// Step - 1 User provides name
app.intent('Provides-Name', async (conv, params) => {

    let studentName = params['person']['name'];

    // Get student details
    let record = await ad.getUserInfo(studentName);

    console.log(`This is the record --> ${record}`);
    console.log(`This is the record --> ${record}`);
    console.log(`This is the record --> ${record}`);
    console.log(`This is the record --> ${record}`);

    if (record['status'] == 1) {

        conv.data.studentName = studentName;
        conv.data.studentID = record['id'];
        conv.data.memoLevel = record['memoLevel'];
        conv.data.conseptsLevel = record['conseptsLevel'];
        conv.data.mathLevel = record['mathLevel'];
        conv.data.clockLevel = record['clockLevel'];

        // Set question number
        let qn = 0;
        conv.data.qn = qn;

        // Set right answer count
        let count = 0;
        conv.data.count = count;

        conv.contexts.set('await-quiz-type', 1);

        conv.ask(`Hello ${studentName}, What would you like to practice next?`);
        conv.ask(new BasicCard({
            text: 'Say or press the button...',
            subtitle: 'What you want practice?',
            title: 'Choose category',
            image: new Image({
                url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2FOVOselfie_400x400.png?alt=media&token=94ffc74a-ce93-462e-9728-bbd06261e2ec',
                alt: 'OVO selfie'
            }),
            display: 'WHITE'
        }));
        conv.ask(new Suggestions('Memo', 'Consepts', 'Clock', 'Math', 'Dialog'));

    } else {

        // Get all the user names
        let names = await ad.getUserNames();

        conv.ask(`Sorry ${studentName}, I did not find your name from the list. Go back to names and try again.`);
        //conv.ask(`Sorry ${studentName}, I didt recognice that name, please choose one on the list.`);
        conv.ask(new Suggestions(names.slice(0, 8)));
    }
});

// Step - 2 Choice is WORD
app.intent('Ask-First-Question', async (conv) => {

    // This is to save the question type
    conv.data.Type = conv.query.charAt(0).toUpperCase() + conv.query.slice(1);

    // Empty question list
    let qList = [];

    // Generate question list
    if (conv.data.Type === 'Memo') {
        qList = await ad.getAllQuestionList('Memo', conv.data.memoLevel);
    } else if (conv.data.Type === 'Consepts') {
        qList = await ad.getAllQuestionList('Consepts', conv.data.conseptsLevel);
    } else if (conv.data.Type === 'Math') {
        qList = await ad.getAllQuestionList('Math', conv.data.mathLevel);
    } else if (conv.data.Type === 'Clock') {
        qList = await ad.getAllQuestionList('Clock', conv.data.clockLevel);
    }

    // Answered question list
    let aqList = await ad.getAnsweredQuestionList(conv.data.studentName);

    // Un Answered question list
    let uaList = qList.filter(x => !aqList.includes(x));

    if (uaList.length == 0) {
        conv.data.uaList = qList;
    } else {
        conv.data.uaList = uaList;
    }

    // Current number for question
    let cn = conv.data.qn;
    // Current question number
    let cqn = conv.data.uaList[cn];

    // Get the question
    let record = await ad.getNewQuestion(conv.data.Type, cqn);

    if (record == 0) {
        conv.contexts.set('await-continue-yes', 1);
        conv.ask('Great! You have answered all the questions at this level. Log out and try again if you want to continue');
        conv.ask(new Suggestions('Menu'));
    } else {
        let Answer = record['Answer'];
        let Question = record['Question'];
        let ImageURL = record['ImageURL'];
        let QID = record['QuestionID'];
        let Hint = record['Hint'];
        let HintImageURL = record['HintImage'];
        let HintText = record['HintText'];

        conv.contexts.set('await-answer-first', 1);

        conv.data.Hint = Hint;
        conv.data.HintImageURL = HintImageURL;
        conv.data.HintText = HintText
        conv.data.Answer = Answer;
        conv.data.Question = Question;
        conv.data.ImageURL = ImageURL;
        conv.data.QID = QID;

        conv.ask(Question);
        conv.ask(new BasicCard({
            image: new Image({
                url: ImageURL,
                alt: 'Question Image'
            }),
            display: 'WHITE'
        }));
    }
});

// Step - 2 Choice is WORD
app.intent('Ask-Question', async (conv) => {

    // Current number of question
    let cn = conv.data.qn;
    // Current question number
    let cqn = conv.data.uaList[cn];

    if (cqn === undefined) {
        // Reset the question number
        conv.data.qn = 0;
        cn = conv.data.qn;
        let qList = [];
        // Generate question list
        if (conv.data.Type === 'Memo') {
            qList = await ad.getAllQuestionList('Memo', conv.data.memoLevel);
        } else if (conv.data.Type === 'Consepts') {
            qList = await ad.getAllQuestionList('Consepts', conv.data.conseptsLevel);
        } else if (conv.data.Type === 'Math') {
            qList = await ad.getAllQuestionList('Math', conv.data.mathLevel);
        } else if (conv.data.Type === 'Clock') {
            qList = await ad.getAllQuestionList('Clock', conv.data.clockLevel);
        }
        conv.data.uaList = qList;
    }

    cqn = conv.data.uaList[cn];

    // Get the question data
    let record = await ad.getNewQuestion(conv.data.Type, cqn);

    if (record == 0) {
        conv.contexts.set('await-continue-yes', 1);
        conv.ask('Congratulations! You have passed all levels in this cotegory.');
        conv.ask(new Suggestions('Menu'));
    } else {
        let Answer = record['Answer'];
        let Question = record['Question'];
        let ImageURL = record['ImageURL'];
        let QID = record['QuestionID'];
        let Hint = record['Hint'];
        let HintImageURL = record['HintImage'];
        let HintText = record['HintText'];

        conv.contexts.set('await-answer-first', 1);

        conv.data.Hint = Hint;
        conv.data.HintImageURL = HintImageURL;
        conv.data.HintText = HintText;
        conv.data.Answer = Answer;
        conv.data.Question = Question;
        conv.data.ImageURL = ImageURL;
        conv.data.QID = QID;

        conv.ask(Question);
        conv.ask(new BasicCard({
            image: new Image({
                url: ImageURL,
                alt: 'Question Image'
            }),
            display: 'WHITE'
        }));
    }
});

app.intent('Dont Know The Answer', async (conv) => {

    conv.contexts.set('await-answer-second', 1);

    if (conv.data.HintText != 0) {
        if (conv.data.HintImageURL != 0) {
            // Show card with hint image and text
            let ssml;
            ssml = '<speak>' +
                '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                '<break time="500ms"/>' +
                'It is okay to not know the answer. See the hint and try again.' +
                '<break time="500ms"/>' +
                conv.data.Hint +
                '</speak>';
            conv.ask(ssml);
            conv.ask(new BasicCard({
                image: new Image({
                    url: conv.data.HintImageURL,
                    alt: 'Hint Image'
                }),
                display: 'WHITE',
                title: conv.data.HintText
            }));
        } else {
            // Show card with image and text
            let ssml;
            ssml = '<speak>' +
                '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                '<break time="500ms"/>' +
                'It is okay to not know the answer. Think hard and try again.' +
                '<break time="500ms"/>' +
                '</speak>';
            conv.ask(ssml);
            conv.ask(new BasicCard({
                image: new Image({
                    url: conv.data.ImageURL,
                    alt: 'Hint Image'
                }),
                display: 'WHITE',
                title: conv.data.HintText
            }));

        }
    } else if (conv.data.Hint != 0) {
        // speak the hint
        let ssml;
        ssml = '<speak>' +
            '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
            '<break time="500ms"/>' +
            'It is okay to not know the answer. Please think hard and try again.' +
            '<break time="500ms"/>' +
            conv.data.Hint +
            '</speak>';
        conv.ask(ssml);
        conv.ask(new BasicCard({
            text: '',
            subtitle: 'Say again',
            title: 'No hint image this time',
            image: new Image({
                url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2Fwrong_answer_1.gif?alt=media&token=518d78ae-2d91-4653-aba4-1a5023739a99',
                alt: 'wondering'
            }),
            display: 'WHITE'
        }));
        conv.ask(new Suggestions('Menu'));
    } else {
        // Show only that it is a wrong answer
        let ssml;
        ssml = '<speak>' +
            '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
            '<break time="500ms"/>' +
            'It is okay to not know the answer. Please think hard and try again.' +
            '<break time="500ms"/>' +
            '</speak>';
        conv.ask(ssml);
        conv.ask(new BasicCard({
            text: 'No hint this time',
            subtitle: 'Do you remember the question?',
            title: '',
            image: new Image({
                url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2Fwrong_answer_1.gif?alt=media&token=518d78ae-2d91-4653-aba4-1a5023739a99',
                alt: 'wondering'
            }),
            display: 'WHITE'
        }));
        conv.ask(new Suggestions('Menu'));
    }

});

// Step - 3 User provides the answer
app.intent('Provides-Answer-First', async (conv) => {

    let clapURL = 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/emojidex/59/clapping-hands-sign_emoji-modifier-fitzpatrick-type-5_1f44f-1f3fe_1f3fe.png';
    let actualAnswer = conv.data.Answer;
    let userAnswer = conv.query;

    if (userAnswer.toLowerCase() === 'menu') {
        conv.followup('menu', {
            type: 'menu'
        });
    }

    // Create new record for ImageQuestionProgress
    fields = {
        'Name': conv.data.studentName,
        'QuestionID': conv.data.QID,
        'Answered': 1,
        'Answer1': userAnswer,
        'Answer2': 'NA'
    }

    // Insert the progress to the table
    ad.createProgress(conv.data.studentName, fields)
        .then((flag) => {
            // Use the flag here
            console.log('Status --> ', flag);
            console.log('Data inserted into progress table.');
        })
        .catch((error) => {
            console.log('Error at createProgree [First - Answer] --> ', error);
        });

    // Generate list from actual answeres in case different answeres
    let ansTempList = actualAnswer.split(',');
    let ansList = [];
    ansTempList.forEach(element => {
        ansList.push(element.toLowerCase());
    });

    if (ansList.includes(userAnswer.toLowerCase())) {

        // Get the right answer message
        let message = await ad.getCongratsMessage('Right Answer');

        if (message['Image'] == 0) {
            conv.ask(message['Message']);
            conv.ask(new BasicCard({
                title: 'Well done',
                subtitle: '',
                text: 'Say or click "next", when you want next question',
                image: new Image({
                    url: clapURL,
                    alt: 'Clap Image'
                })
            }));
        } else {
            conv.ask(message['Message']);
            conv.ask(new BasicCard({
                title: 'Well done!',
                subtitle: '',
                text: 'Say or click "next", when you want new question',
                image: new Image({
                    url: message['ImageURL'],
                    alt: 'Congratulation Image'
                })
            }));
        }

        // Increment the count of right answer
        conv.data.count = conv.data.count + 1;

        // Increment the question number
        conv.data.qn = conv.data.qn + 1;

        if (conv.data.count == 3) {

            // Update student level
            let cLevel = conv.data[`${conv.data.Type.toLowerCase()}Level`];

            // Generate the string LevelX
            let nLevel = parseInt(cLevel.split('l')[1]) + 1;
            if (conv.data.Type === 'Memo') {
                fields = {
                    'Memo': `Level${nLevel}`
                }
                conv.data.memoLevel = `Level${nLevel}`;
            } else if (conv.data.Type === 'Consepts') {
                fields = {
                    'Consepts': `Level${nLevel}`
                }
                conv.data.conseptsLevel = `Level${nLevel}`;
            } else if (conv.data.Type === 'Math') {
                fields = {
                    'Math': `Level${nLevel}`
                }
                conv.data.mathLevel = `Level${nLevel}`;
            } else {
                fields = {
                    'Clock': `Level${nLevel}`
                }
                conv.data.clockLevel = `Level${nLevel}`;
            }

            let flag = await ad.updateStudent(conv.data.studentID, fields);

            // Get all the questions from new Level
            let qList = await ad.getAllQuestionList(conv.data.Type, `Level${nLevel}`);
            conv.data.uaList = qList;

            // Reset the count
            conv.data.count = 0;

            // Reset the question number
            conv.data.qn = 0;

            if (flag == 1) {
                // Ask new question here
                conv.contexts.set('await-continue-yes', 1);

                let message = await ad.getCongratsMessage('Level Up');

                if (message['Image'] == 0) {
                    let m = message['Message'];
                    conv.ask(m);
                    conv.ask(new Suggestions('Next', 'Menu', 'Results'));
                } else {
                    let m = message['Message'];
                    conv.ask(m);
                    conv.ask(new Suggestions('Next', 'Menu', 'Results'));
                }
            } else {
                conv.ask('Oh on, I encountered an question error. Go to menu and try again.')
                conv.ask(new Suggestions('Menu'));
            }

        } else {
            conv.contexts.set('await-continue-yes', 1);
            conv.ask(new Suggestions('Next', 'Menu', 'Results'));
        }

    } else {

        conv.contexts.set('await-answer-second', 1);

        if (conv.data.HintText != 0) {
            if (conv.data.HintImageURL != 0) {
                // Show card with hint image and text
                let ssml;
                ssml = '<speak>' +
                    '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                    '<break time="500ms"/>' +
                    'You are on the trail but not quite. See the hint and try again.' +
                    '<break time="500ms"/>' +
                    conv.data.Hint +
                    '</speak>';
                conv.ask(ssml);
                conv.ask(new BasicCard({
                    image: new Image({
                        url: conv.data.HintImageURL,
                        alt: 'Hint Image'
                    }),
                    display: 'WHITE',
                    title: conv.data.HintText
                }));
            } else {
                // Show card with image and text
                let ssml;
                ssml = '<speak>' +
                    '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                    '<break time="500ms"/>' +
                    'You are on the trail but not quite. Please try again.' +
                    '<break time="500ms"/>' +
                    '</speak>';
                conv.ask(ssml);
                conv.ask(new BasicCard({
                    image: new Image({
                        url: conv.data.ImageURL,
                        alt: 'Hint Image'
                    }),
                    display: 'WHITE',
                    title: conv.data.HintText
                }));

            }
        } else if (conv.data.Hint != 0) {
            // speak the hint
            let ssml;
            ssml = '<speak>' +
                '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                '<break time="500ms"/>' +
                'You are on the trail but not quite. Please try again.' +
                '<break time="500ms"/>' +
                conv.data.Hint +
                '</speak>';
            conv.ask(ssml);
            conv.ask(new BasicCard({
                text: '',
                subtitle: 'Say again',
                title: 'No hint image this time',
                image: new Image({
                    url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2Fwrong_answer_1.gif?alt=media&token=518d78ae-2d91-4653-aba4-1a5023739a99',
                    alt: 'wondering'
                }),
                display: 'WHITE'
            }));
            conv.ask(new Suggestions('Menu'));
        } else {
            // Show only that it is a wrong answer
            let ssml;
            ssml = '<speak>' +
                '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
                '<break time="500ms"/>' +
                'You are on the trail but not quite. Please try again.' +
                '<break time="500ms"/>' +
                '</speak>';
            conv.ask(ssml);
            conv.ask(new BasicCard({
                text: 'No hint this time',
                subtitle: 'Do you remember the question?',
                title: '',
                image: new Image({
                    url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/program%20images%2Fwrong_answer_1.gif?alt=media&token=518d78ae-2d91-4653-aba4-1a5023739a99',
                    alt: 'wondering'
                }),
                display: 'WHITE'
            }));
            conv.ask(new Suggestions('Menu'));
        }
    }
});

// User provides answer second time
app.intent('Provides-Answer-Second', async (conv) => {

    let clapURL = 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/emojidex/59/clapping-hands-sign_emoji-modifier-fitzpatrick-type-5_1f44f-1f3fe_1f3fe.png';
    let actualAnswer = conv.data.Answer;
    let userAnswer = conv.query;

    if (userAnswer.toLowerCase() === 'menu') {
        console.log('came here.');
        conv.followup('menu', {
            type: 'menu'
        });
    }

    // Update ImageQuestionProgress
    fields = {
        'Answer2': userAnswer
    }

    let id = await ad.getProgressByID(conv.data.studentName, conv.data.QID);

    if (id == 0) {
        console.log('Error at getProcessByID [Answer -Two]')
    } else {
        ad.updateProgress(conv.data.studentName, id, fields)
            .then((flag) => {
                // Use the flag here
            })
            .catch((error) => {
                console.log('Error at updateProgress [Answer - Two] --> ', error);
            });
    }

    // Generate list from actual answeres in case different answers
    let ansTempList = actualAnswer.split(',');
    let ansList = [];
    ansTempList.forEach(element => {
        ansList.push(element.toLowerCase());
    });

    if (ansList.includes(userAnswer.toLowerCase())) {

        let message = await ad.getCongratsMessage('Right Answer');

        if (message['Image'] == 0) {
            conv.ask(message['Message']);
            conv.ask(new BasicCard({
                image: new Image({
                    url: clapURL,
                    alt: 'Clap Image'
                })
            }));
        } else {
            conv.ask(message['Message']);
            conv.ask(new BasicCard({
                image: new Image({
                    url: message['ImageURL'],
                    alt: 'Congratulation Image'
                })
            }));
        }

        // Increment the count of right answer
        conv.data.count = conv.data.count + 1;

        // Increment the question number
        conv.data.qn = conv.data.qn + 1;

        if (conv.data.count == 3) {

            // Update student level
            let cLevel = conv.data[`${conv.data.Type.toLowerCase()}Level`];

            // Generate the string LevelX
            let nLevel = parseInt(cLevel.split('l')[1]) + 1;
            if (conv.data.Type === 'Memo') {
                fields = {
                    'Memo': `Level${nLevel}`
                }
                conv.data.memoLevel = `Level${nLevel}`;
            } else if (conv.data.Type === 'Consepts') {
                fields = {
                    'Consepts': `Level${nLevel}`
                }
                conv.data.conseptsLevel = `Level${nLevel}`;
            } else if (conv.data.Type === 'Math') {
                fields = {
                    'Math': `Level${nLevel}`
                }
                conv.data.mathLevel = `Level${nLevel}`;
            } else {
                fields = {
                    'Clock': `Level${nLevel}`
                }
                conv.data.clockLevel = `Level${nLevel}`;
            }

            let flag = await ad.updateStudent(conv.data.studentID, fields);

            // Get question list
            let qList = await ad.getAllQuestionList(conv.data.Type, `Level${nLevel}`);
            conv.data.uaList = qList;

            // Reset the count
            conv.data.count = 0;

            // Reset the question number
            conv.data.qn = 0;

            if (flag == 1) {

                let message = await ad.getCongratsMessage('Level Up');

                if (message['Image'] == 0) {
                    let m = message['Message'];
                    conv.ask(m);
                    conv.ask(new Suggestions('Next', 'Menu', 'Results'));
                } else {
                    let m = message['Message'];
                    conv.ask(m);
                    conv.ask(new Suggestions('Next', 'Menu', 'Results'));
                }

            } else {
                conv.ask('I encountered an level error in my software. Go back to menu and try again.')
            }

        } else {
            conv.contexts.set('await-continue-yes', 1);
            conv.ask(new Suggestions('Next', 'Menu', 'Results'));
        }

    } else {

        // Reset the count
        conv.data.count = 0;

        // Increase the question number
        conv.data.qn = conv.data.qn + 1;

        // Ask new question here
        conv.contexts.set('await-continue-yes', 1);
        conv.ask(`Good try. The answer is ` + actualAnswer + `.`);
        conv.ask(new Suggestions('Next', 'Menu', 'Results'));
    }
});

// Dialog intent
app.intent('Dialog', (conv) => {
    let ssml;
    ssml = '<speak>' +
        '<audio src="https://www.soundjay.com/misc/sounds/magic-chime-01.mp3"></audio>' +
        '<break time="200ms"/>' +
        'Welcome to dialog exercise' +
        '<break time="500ms"/>' +
        'Here you can practice to do different tasks.' +
        '<break time="500ms"/>' +
        'Choose the category you want to practice.' +
        '</speak>';
    conv.ask(ssml);
    conv.ask(new BasicCard({
        title: 'Dialog exercise',
        subtitle: 'What do you want to practice?',
        text: 'Choose the category.',
        image: new Image({
            url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/quiz_images%2FDialog%2Fdialog.png?alt=media&token=b326e9e4-a338-4e2d-95fe-25e023dddcd9',
            alt: 'Dialog'
        }),
        display: 'WHITE'
    }));

    conv.ask(new Suggestions('Tickets', 'Restaurant', 'E-Shop', '-> Back'));
});

// E Shop intent
app.intent('E-Shop', (conv) => {
    conv.contexts.set('e-shop-conv', 1);
    conv.data.checkoutPrice = 0;
    let ssml;
    ssml = '<speak>' +
        '<audio src="https://www.soundjay.com/misc/sounds/magic-chime-01.mp3"></audio>' +
        '<break time="200ms"/>' +
        'Welcome to Supermarket' +
        '<break time="500ms"/>' +
        'Here you can practice to buy many everyday items.' +
        '<break time="300ms"/>' +
        'You can say like:' +
        '<break time="200ms"/>' +
        'I would like water and bread?' +
        '</speak>';
    conv.ask(ssml);
    conv.ask(new BasicCard({
        title: 'Supermarket exercise',
        subtitle: 'What do you want?',
        text: 'Say what items you want.  \nLike: I want 3 apple.',
        image: new Image({
            url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/quiz_images%2FDialog%2Ffood.png?alt=media&token=e7e99a23-5f8c-42ca-a7c5-9bf1059d2a4e',
            alt: 'Supermarket'
        }),
        display: 'WHITE'
    }));
});

app.intent('E-Shop-Buy-Items', async (conv, params) => {

    conv.contexts.set('e-shop-conv', 1);

    let item = params['item'];
    let record = await ad.getItemFromEShop(item);

    if (record['status'] == 0) {
        conv.ask(`${item} is not available in this store, do you want anything else?`);
    } else {
        let price = record['Price'];
        conv.data.checkoutPrice = conv.data.checkoutPrice + price;
        conv.ask(`${item} is added to your cart, do you want anything else?`)
        conv.ask(new BasicCard({
            image: new Image({
                url: record['ImageURL'],
                alt: 'E-Shop Image'
            })
        }));
    }
})

// E Shop checkout intent
app.intent('E-Shop-Checkout', (conv) => {
    conv.contexts.set('e-shop-conv', 0);
    conv.close(`It takes ${conv.data.checkoutPrice} euros in total. Thank you and have a nice day!`);
    conv.ask(new Suggestions('Dialog', 'Main menu'));
});

// Continue yes
app.intent('Continue-Yes', (conv) => {
    // Call an event to continue asking a new question
    conv.followup('question', {
        type: 'Word'
    });
});

// Continue no
app.intent('Continue-No', (conv) => {
    conv.ask(`Thank you ${conv.data.studentName} for using the app.`);
});

// Cancel button
app.intent('Cancel', (conv) => {
    conv.close(`Thank you ${conv.data.studentName} for using the app.`);
});

// Default fallback intent
app.intent('Default Fallback Intent', (conv) => {

    conv.data.fallbackCount = conv.data.fallbackCount + 1;

    let contexts = conv.contexts.input;

    for (const key in contexts) {
        if (contexts.hasOwnProperty(key)) {
            if (contexts[key]['name'].includes('await-')) {
                let vals = contexts[key]['name'].split('/');
                getContext = vals[vals.length - 1]
            }
        }
    }

    if (conv.data.fallbackCount < 10) {
        conv.contexts.set(getContext, 1);
        conv.ask('Please say It again.');
        conv.ask(new Suggestions('MENU'));

    } else {
        conv.close('Sorry, I am facing trouble hearing you, try again after sometime.');
    }
});

// Show result
app.intent('Show Results', async (conv) => {

    // Get student result
    let result = await ad.getStudentLevels(conv.data.studentName);

    // Check the status
    if (result['status'] == 1) {
        conv.contexts.set('await-quiz-type', 1);
        conv.ask(`Hi, ${conv.data.studentName}, your results are listed in the table below`);
        conv.ask(new Table({
            dividers: true,
            columns: ['Question Type', 'Level'],
            rows: [
                ['Memo', result['memoLevel']],
                ['Consepts', result['conseptsLevel']],
                ['Clock', result['clockLevel']],
                ['Math', result['mathLevel']],
            ],
        }));
        let ssml;
        ssml = '<speak>' +
            '<audio src="https://www.soundjay.com/button/sounds/button-09.mp3"></audio>' +
            '<break time="1500ms"/>' +
            'What would you like to do next?.' +
            '</speak>';
        conv.ask(ssml);
        conv.ask(`What would you like to do next?`);
        conv.ask(new Suggestions('Menu', 'Memo', 'Math', 'Consepts', 'Clock', 'Dialog'));
    } else {
        conv.contexts.set('await-quiz-type', 1);
        conv.ask(`Sorry ${conv.data.studentName}, we did not find your result at this time.`);
        //conv.ask(`Hello ${studentName}, What would you like to practice next?`);
        conv.ask(new Suggestions('Memo', 'Math', 'Consepts', 'Clock', 'Dialog'));
    }
});

const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit' };

app.intent('Tickets - order', async (conv, params) => {
    
    let price = Math.floor(Math.random() * 200);
    let vehicle = params['Vehicle'];
    let city = params['to']['city'];
    let dateString = params['date'];

    let date = new Date(Date.parse(dateString));

    conv.ask(`Ok. So you want to go by ${vehicle} to ${city} at ${date.toLocaleString('en-US', options)}. It is then ${price}€. Thank you and have nice day.`);

    conv.ask(new BasicCard({
        image: new Image({
            url: 'https://firebasestorage.googleapis.com/v0/b/ovobot-quiz.appspot.com/o/quiz_images%2FDialog%2Ftickets2.png?alt=media&token=444699d6-d8b2-4eff-9705-e72ede0baacd',
            alt: 'Vehicle Image'
        }),
        title: 'Tickets',
        subtitle: 'Have a nice trip.',

    }));

    conv.ask(new Suggestions('Menu', 'Dialog', 'Travel'));
});

// Webserver
const Webapp = express();

Webapp.use(bodyParser.urlencoded({ extended: true }));
Webapp.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

Webapp.get('/', (req, res) => {
    res.send('Hello World.!')
});

Webapp.post('/webhook', app);

Webapp.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});
