"""Control layer: platform fundraising reports."""

from backend.entity.report import Report


class ReportControl:
    def __init__(self):
        self._reports = Report()

    def get_daily_report(self, account_id, anchor):
        return self._reports.get_daily_report(account_id, anchor)

    def get_weekly_report(self, account_id, anchor):
        return self._reports.get_weekly_report(account_id, anchor)

    def get_monthly_report(self, account_id, month_year):
        return self._reports.get_monthly_report(account_id, month_year)

