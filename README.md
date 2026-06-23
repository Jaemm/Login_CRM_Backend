# CRM Backend Portfolio

NestJS + TypeORM 기반 CRM 백엔드의 포트폴리오용 정리본입니다.

## Overview

- JWT 기반 인증과 토큰 재발급
- 고객 / 상담사 인증 흐름 분리
- 이메일 인증, 비밀번호 재설정, 소셜 로그인
- 분석 결과 전달용 webhook 및 내부 토큰 검증
- GDPR 관련 개인정보 요청 처리

## Stack

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- JWT
- Redis / BullMQ
- Swagger
- Prometheus

## Public Fork Notes

이 저장소는 개인 포트폴리오 공개를 전제로 민감정보를 제거한 버전입니다.

- 실제 `.env` 값은 제거하고 [`/.env.example`](./.env.example)만 남겼습니다.
- 회사 식별 정보, 실도메인, 실주소, 실메일은 example 값으로 치환했습니다.
- 운영 전용 문서와 샘플 payload는 공개용으로 정리했습니다.

## Auth Focus

- `src/modules/auth`
- `src/modules/customers`
- `src/modules/consultants`
- `src/common/middleWare/authMiddlware`
- `src/jwt`

## Local Setup

1. `.env.example`을 복사해서 `.env`를 만듭니다.
2. 환경변수를 채웁니다.
3. `npm install`
4. `npm run dev`

## Notes

This repository is intended for portfolio review only. Any production credentials, internal URLs, and real customer data have been removed or replaced with placeholders.
