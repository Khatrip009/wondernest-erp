import { gql } from '@apollo/client';

export const GET_INQUIRY_STATS = gql`
  query GetInquiryStats($filter: InquiryFilter) {
    inquiriesCollection(filter: $filter) {
      aggregates {
        totalCount
      }
    }
    inquiriesGroupBy(groupBy: [status], filter: $filter) {
      keys
      aggregates {
        totalCount
      }
    }
    inquiry_sourcesCollection {
      edges {
        node {
          id
          name
          inquiriesCollection(filter: $filter) {
            aggregates {
              totalCount
            }
          }
        }
      }
    }
    coursesCollection {
      edges {
        node {
          id
          course_name
          inquiriesCollection(filter: $filter) {
            aggregates {
              totalCount
            }
          }
        }
      }
    }
  }
`;

export const GET_UPCOMING_DEMOS = gql`
  query GetUpcomingDemos($filter: DemoSessionsFilter) {
    demo_sessionsCollection(
      filter: $filter
      orderBy: { scheduled_at: AscNullsLast }
      first: 10
    ) {
      edges {
        node {
          id
          scheduled_at
          duration_minutes
          inquiry_id
          inquiries {
            id
            student_name
          }
          teachers {
            id
            first_name
            last_name
          }
        }
      }
    }
  }
`;

export const GET_RECENT_DEMOS = gql`
  query GetRecentDemos($filter: DemoSessionsFilter) {
    demo_sessionsCollection(
      filter: $filter
      orderBy: { conducted_at: DescNullsLast }
      first: 10
    ) {
      edges {
        node {
          id
          conducted_at
          outcome
          inquiry_id
          inquiries {
            id
            student_name
          }
          teachers {
            id
            first_name
            last_name
          }
        }
      }
    }
  }
`;