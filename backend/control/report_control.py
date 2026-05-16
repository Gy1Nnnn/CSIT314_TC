"""Control layer: platform fundraising reports."""

from backend.entity.report import Report


class ReportControl:
    def __init__(self):
        self._reports = Report()

    def fundraising_performance(self, account_id, period, anchor, month_year):
        return self._reports.fundraising_performance(
            account_id, period, anchor, month_year
        )
