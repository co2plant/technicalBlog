const express = require('express');
const path = require('path');

const app = express();

// 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.set('port', process.env.PORT || 3000);

// 메인 페이지
app.get('/', (req, res) => {
    const samplePosts = [
        {
            id: 1,
            title: '첫 번째 게시글',
            date: '2024-01-15',
            excerpt: '블로그를 시작하며 첫 번째 글을 작성합니다.'
        },
        {
            id: 2,
            title: 'Node.js와 Express 시작하기',
            date: '2024-01-20',
            excerpt: 'Node.js와 Express를 사용한 웹 개발의 기초를 알아봅시다.'
        }
    ];
    
    res.render('index', {
        title: '기술 블로그',
        posts: samplePosts
    });
});

app.listen(app.get('port'), ()=>{
    console.log(app.get('port'), '번 포트에서 대기 중')
});