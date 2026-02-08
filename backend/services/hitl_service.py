"""
HITL (Human-in-the-Loop) Service for BioEngine V3

Manages critical actions that require human approval before execution.
Implements safety checks for training load changes, injury risk, and other critical decisions.
"""

import sqlite3
import datetime
import json
import logging
from typing import Dict, Any, Optional, List
from enum import Enum
from pydantic import BaseModel
from config import DB_PATH

logger = logging.getLogger(__name__)


class ActionStatus(str, Enum):
    """Status of a pending action"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ActionSeverity(str, Enum):
    """Severity level of the action"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PendingAction(BaseModel):
    """Model for a pending action requiring approval"""
    action_id: str
    action_type: str
    description: str
    severity: ActionSeverity
    proposed_changes: Dict[str, Any]
    reasoning: str
    risks: List[str]
    benefits: List[str]
    status: ActionStatus = ActionStatus.PENDING
    created_at: str
    expires_at: str


class HITLService:
    """
    Human-in-the-Loop service for critical action approval.
    
    Critical actions include:
    - Training load increases > 10%
    - Exercise recommendations when pain > 3/10
    - Changes to medical restrictions
    - Equipment modifications
    """
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize HITL database table"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS hitl_actions (
                    action_id TEXT PRIMARY KEY,
                    action_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    proposed_changes TEXT NOT NULL,
                    reasoning TEXT,
                    risks TEXT,
                    benefits TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    approved_at TEXT,
                    approved_by TEXT,
                    rejection_reason TEXT
                )
            """)
            conn.commit()
            logger.info("HITL database initialized")
        except Exception as e:
            logger.error(f"Error initializing HITL database: {e}")
        finally:
            conn.close()
    
    def create_action(
        self,
        action_type: str,
        description: str,
        severity: ActionSeverity,
        proposed_changes: Dict[str, Any],
        reasoning: str,
        risks: List[str],
        benefits: List[str],
        ttl_hours: int = 24
    ) -> PendingAction:
        """
        Create a new pending action requiring approval.
        
        Args:
            action_type: Type of action (e.g., "training_load_increase")
            description: Human-readable description
            severity: Severity level
            proposed_changes: Dictionary of proposed changes
            reasoning: AI reasoning for this action
            risks: List of identified risks
            benefits: List of expected benefits
            ttl_hours: Hours until action expires
        
        Returns:
            PendingAction object
        """
        action_id = f"{action_type}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        created_at = datetime.datetime.now()
        expires_at = created_at + datetime.timedelta(hours=ttl_hours)
        
        action = PendingAction(
            action_id=action_id,
            action_type=action_type,
            description=description,
            severity=severity,
            proposed_changes=proposed_changes,
            reasoning=reasoning,
            risks=risks,
            benefits=benefits,
            created_at=created_at.isoformat(),
            expires_at=expires_at.isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                INSERT INTO hitl_actions 
                (action_id, action_type, description, severity, proposed_changes, 
                 reasoning, risks, benefits, status, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                action.action_id,
                action.action_type,
                action.description,
                action.severity.value,
                json.dumps(action.proposed_changes),
                action.reasoning,
                json.dumps(action.risks),
                json.dumps(action.benefits),
                action.status.value,
                action.created_at,
                action.expires_at
            ))
            conn.commit()
            logger.info(f"Created HITL action: {action_id} (severity: {severity})")
        except Exception as e:
            logger.error(f"Error creating HITL action: {e}")
            raise
        finally:
            conn.close()
        
        return action
    
    def approve_action(self, action_id: str, approved_by: str = "user") -> bool:
        """
        Approve a pending action.
        
        Args:
            action_id: ID of the action to approve
            approved_by: Who approved it (default: "user")
        
        Returns:
            True if approved successfully, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        try:
            # Check if action exists and is pending
            cursor = conn.execute(
                "SELECT status, expires_at FROM hitl_actions WHERE action_id = ?",
                (action_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                logger.warning(f"Action {action_id} not found")
                return False
            
            status, expires_at = row
            
            if status != ActionStatus.PENDING.value:
                logger.warning(f"Action {action_id} is not pending (status: {status})")
                return False
            
            # Check if expired
            if datetime.datetime.fromisoformat(expires_at) < datetime.datetime.now():
                conn.execute(
                    "UPDATE hitl_actions SET status = ? WHERE action_id = ?",
                    (ActionStatus.EXPIRED.value, action_id)
                )
                conn.commit()
                logger.warning(f"Action {action_id} has expired")
                return False
            
            # Approve the action
            conn.execute("""
                UPDATE hitl_actions 
                SET status = ?, approved_at = ?, approved_by = ?
                WHERE action_id = ?
            """, (
                ActionStatus.APPROVED.value,
                datetime.datetime.now().isoformat(),
                approved_by,
                action_id
            ))
            conn.commit()
            logger.info(f"Action {action_id} approved by {approved_by}")
            return True
            
        except Exception as e:
            logger.error(f"Error approving action: {e}")
            return False
        finally:
            conn.close()
    
    def reject_action(self, action_id: str, reason: str = "") -> bool:
        """
        Reject a pending action.
        
        Args:
            action_id: ID of the action to reject
            reason: Reason for rejection
        
        Returns:
            True if rejected successfully, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                UPDATE hitl_actions 
                SET status = ?, rejection_reason = ?
                WHERE action_id = ? AND status = ?
            """, (
                ActionStatus.REJECTED.value,
                reason,
                action_id,
                ActionStatus.PENDING.value
            ))
            conn.commit()
            logger.info(f"Action {action_id} rejected: {reason}")
            return True
        except Exception as e:
            logger.error(f"Error rejecting action: {e}")
            return False
        finally:
            conn.close()
    
    def get_pending_actions(self) -> List[PendingAction]:
        """Get all pending actions"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute("""
                SELECT * FROM hitl_actions 
                WHERE status = ? AND expires_at > ?
                ORDER BY created_at DESC
            """, (ActionStatus.PENDING.value, datetime.datetime.now().isoformat()))
            
            actions = []
            for row in cursor.fetchall():
                actions.append(PendingAction(
                    action_id=row['action_id'],
                    action_type=row['action_type'],
                    description=row['description'],
                    severity=ActionSeverity(row['severity']),
                    proposed_changes=json.loads(row['proposed_changes']),
                    reasoning=row['reasoning'],
                    risks=json.loads(row['risks']),
                    benefits=json.loads(row['benefits']),
                    status=ActionStatus(row['status']),
                    created_at=row['created_at'],
                    expires_at=row['expires_at']
                ))
            
            return actions
        except Exception as e:
            logger.error(f"Error getting pending actions: {e}")
            return []
        finally:
            conn.close()
    
    def check_training_load_change(
        self,
        current_load: float,
        proposed_load: float,
        context: Dict[str, Any]
    ) -> Optional[PendingAction]:
        """
        Check if a training load change requires approval.
        
        Args:
            current_load: Current training load (km/week or hours/week)
            proposed_load: Proposed new load
            context: Additional context (pain level, fatigue, etc.)
        
        Returns:
            PendingAction if approval required, None otherwise
        """
        increase_pct = ((proposed_load - current_load) / current_load) * 100
        
        # Require approval if increase > 10% (master athlete safety rule)
        if increase_pct > 10:
            severity = ActionSeverity.HIGH if increase_pct > 20 else ActionSeverity.MEDIUM
            
            risks = [
                f"Aumento de carga del {increase_pct:.1f}% excede el límite recomendado del 10%",
                "Riesgo de sobrecarga y lesión en atleta máster (49 años)",
                "Posible agravamiento de tendinosis rotuliana"
            ]
            
            # Add context-specific risks
            if context.get('pain_level', 0) > 0:
                risks.append(f"Dolor activo reportado (nivel {context['pain_level']}/10)")
                severity = ActionSeverity.CRITICAL
            
            if context.get('fatigue') == 'high':
                risks.append("Fatiga alta detectada")
            
            benefits = [
                "Progresión hacia objetivos de rendimiento",
                "Adaptación fisiológica si se ejecuta correctamente"
            ]
            
            return self.create_action(
                action_type="training_load_increase",
                description=f"Aumentar carga de entrenamiento de {current_load:.1f} a {proposed_load:.1f} ({increase_pct:.1f}% de aumento)",
                severity=severity,
                proposed_changes={
                    "current_load": current_load,
                    "proposed_load": proposed_load,
                    "increase_percentage": increase_pct
                },
                reasoning=f"El aumento propuesto del {increase_pct:.1f}% excede el límite seguro del 10% para atletas máster.",
                risks=risks,
                benefits=benefits,
                ttl_hours=48
            )
        
        return None


# Singleton instance
_hitl_service = None

def get_hitl_service() -> HITLService:
    """Get singleton HITL service instance"""
    global _hitl_service
    if _hitl_service is None:
        _hitl_service = HITLService()
    return _hitl_service
